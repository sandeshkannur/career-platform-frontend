// src/pages/admin/AdminAnalyticsDashboardPage.jsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getPlatformAnalytics } from "../../api/adminAnalytics";

// ── Design tokens (inline) ────────────────────────────────────────────────
const C = {
  navy:   "#0b1f3a",
  teal:   "#0d9488",
  amber:  "#d97706",
  red:    "#dc2626",
  green:  "#16a34a",
  bg:     "#f0f4f8",
  card:   "#ffffff",
  border: "#e2e8f0",
  text:   "#1a2332",
  muted:  "#64748b",
};

const TABS = [
  { id: "overview",  label: "Overview" },
  { id: "funnel",    label: "Funnel & Students" },
  { id: "bias",      label: "Bias Detection" },
  { id: "skills",    label: "Skill Scores" },
  { id: "careers",   label: "Career Recs" },
  { id: "issues",    label: "Issues Tracker" },
];

// ── Tiny reusable primitives ──────────────────────────────────────────────

function Card({ children, style }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: 16, ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12, color: C.text }}>
      {children}
    </div>
  );
}

function Badge({ label, color = C.navy }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px",
      borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: color + "22", color, border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  );
}

function KpiCard({ label, value, color = C.navy, sub }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function HBar({ label, value, max, color = C.teal, badge, labelWidth = 180 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <div style={{ width: labelWidth, fontSize: 12, color: C.text, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={label}>
        {label}
      </div>
      <div style={{ flex: 1, background: C.border, borderRadius: 4, height: 18, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, minWidth: 36, textAlign: "right" }}>
        {value}
      </div>
      {badge && (
        <span style={{ fontSize: 11, fontWeight: 700, background: "#dc262622", color: C.red, borderRadius: 999, padding: "1px 7px", border: "1px solid #dc262644" }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function RefreshButton({ onRefresh, loading }) {
  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      style={{
        background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "4px 12px", fontSize: 12, cursor: loading ? "not-allowed" : "pointer",
        color: C.navy, fontWeight: 600, opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? "Refreshing…" : "↻ Refresh"}
    </button>
  );
}

// ── KPI Strip ─────────────────────────────────────────────────────────────

function KpiStrip({ data }) {
  const f = data?.funnel ?? {};
  const resultPct = f.total_assessments > 0
    ? Math.round((f.total_with_results / f.total_assessments) * 100)
    : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 20 }}>
      <KpiCard label="Total Assessments" value={f.total_assessments ?? "—"} color={C.navy} />
      <KpiCard
        label="Results Generated"
        value={f.total_with_results ?? "—"}
        color={resultPct >= 80 ? C.teal : C.amber}
        sub={`${resultPct}% of total`}
      />
      <KpiCard
        label="No Results"
        value={f.submitted_no_results ?? "—"}
        color={(f.submitted_no_results ?? 0) > 0 ? C.red : C.green}
      />
      <KpiCard
        label="HSI Overflows"
        value={data?.overflow_hsi_count ?? "—"}
        color={(data?.overflow_hsi_count ?? 0) > 0 ? C.red : C.green}
      />
      <KpiCard
        label="CPS Locked"
        value={data?.cps_stats?.is_locked ? "YES" : "NO"}
        color={data?.cps_stats?.is_locked ? C.red : C.green}
      />
      <KpiCard
        label="Students"
        value={data?.students?.length ?? "—"}
        color={C.navy}
      />
    </div>
  );
}

// ── Tab: Overview ─────────────────────────────────────────────────────────

function TabOverview({ data }) {
  const issues = Array.isArray(data?.data_issues) ? data.data_issues : [];
  const critical = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");

  const f = data?.funnel ?? {};
  const funnelRows = [
    { label: "Started", value: f.total_assessments ?? 0 },
    { label: "Submitted", value: f.total_submitted ?? f.total_with_results ?? 0 },
    { label: "Results Generated", value: f.total_with_results ?? 0 },
    { label: "No Results", value: f.submitted_no_results ?? 0 },
    { label: "HSI Overflows", value: data?.overflow_hsi_count ?? 0 },
    { label: "Zero HSI", value: data?.zero_hsi_count ?? 0 },
  ];
  const maxFunnel = Math.max(...funnelRows.map((r) => r.value), 1);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <KpiStrip data={data} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <SectionTitle>🔴 Critical Issues ({critical.length})</SectionTitle>
          {critical.length === 0
            ? <p style={{ fontSize: 13, color: C.muted }}>None — all clear.</p>
            : critical.map((iss, i) => (
              <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < critical.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.red }}>{iss.title}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{iss.detail}</div>
              </div>
            ))
          }
        </Card>
        <Card>
          <SectionTitle>⚠️ Warnings ({warnings.length})</SectionTitle>
          {warnings.length === 0
            ? <p style={{ fontSize: 13, color: C.muted }}>None.</p>
            : warnings.map((iss, i) => (
              <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < warnings.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.amber }}>{iss.title}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{iss.detail}</div>
              </div>
            ))
          }
        </Card>
      </div>

      <Card>
        <SectionTitle>Assessment Funnel</SectionTitle>
        {funnelRows.map((row) => (
          <HBar
            key={row.label}
            label={row.label}
            value={row.value}
            max={maxFunnel}
            color={row.label.includes("No Results") || row.label.includes("Overflow") || row.label.includes("Zero") ? C.red : C.teal}
            labelWidth={160}
          />
        ))}
      </Card>
    </div>
  );
}

// ── Tab: Funnel & Students ─────────────────────────────────────────────────

function TabFunnel({ data }) {
  const students = Array.isArray(data?.students) ? data.students : [];
  const careersPerAssessment = Array.isArray(data?.careers_per_assessment) ? data.careers_per_assessment : [];
  const streamDist = Array.isArray(data?.stream_distribution) ? data.stream_distribution : [];
  const maxCpa = Math.max(...careersPerAssessment.map((r) => r.assessment_count ?? r.count ?? 0), 1);
  const maxStream = Math.max(...streamDist.map((r) => r.count ?? 0), 1);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <SectionTitle>Students ({students.length})</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.bg, textAlign: "left" }}>
                {["Name","Grade","Email","Tier","Assessments","With Results","No Results","Key Skills","Interest"].map((h) => (
                  <th key={h} style={{ padding: "6px 10px", fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.length === 0
                ? <tr><td colSpan={9} style={{ padding: 12, color: C.muted, textAlign: "center" }}>No student data</td></tr>
                : students.map((s, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "6px 10px", fontWeight: 600 }}>{s.student_name ?? s.name ?? "—"}</td>
                    <td style={{ padding: "6px 10px" }}>{s.grade ?? "—"}</td>
                    <td style={{ padding: "6px 10px", color: C.muted }}>{s.email ?? "—"}</td>
                    <td style={{ padding: "6px 10px" }}>{s.subscription_tier ?? "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>{s.total_assessments ?? "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>{s.assessments_with_results ?? "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "center", color: (s.assessments_no_results ?? 0) > 0 ? C.red : "inherit", fontWeight: (s.assessments_no_results ?? 0) > 0 ? 700 : 400 }}>
                      {s.assessments_no_results ?? "—"}
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                      {s.has_keyskill_scores === true
                        ? <span style={{ color: C.green, fontWeight: 700 }}>✓</span>
                        : <span style={{ color: C.red, fontWeight: 700 }}>✗</span>}
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                      {s.has_interest_inventory === true
                        ? <span style={{ color: C.green, fontWeight: 700 }}>✓</span>
                        : <span style={{ color: C.muted }}>—</span>}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <SectionTitle>Careers Per Assessment Distribution</SectionTitle>
          {careersPerAssessment.length === 0
            ? <p style={{ fontSize: 13, color: C.muted }}>No data</p>
            : careersPerAssessment.map((row, i) => {
              const count = row.career_count ?? row.careers ?? 0;
              const isBug = count === 368;
              return (
                <HBar
                  key={i}
                  label={isBug ? `${count} careers ⚠` : `${count} careers`}
                  value={row.assessment_count ?? row.count ?? 0}
                  max={maxCpa}
                  color={isBug ? C.red : C.teal}
                  badge={isBug ? "BUG: full catalog" : undefined}
                  labelWidth={130}
                />
              );
            })
          }
        </Card>
        <Card>
          <SectionTitle>Stream Distribution</SectionTitle>
          {streamDist.length === 0
            ? <p style={{ fontSize: 13, color: C.muted }}>No data</p>
            : streamDist.map((row, i) => (
              <HBar key={i} label={row.stream ?? "—"} value={row.count ?? 0} max={maxStream} color={C.navy} labelWidth={120} />
            ))
          }
        </Card>
      </div>
    </div>
  );
}

// ── Tab: Bias Detection ───────────────────────────────────────────────────

const PATTERN_COLORS = {
  straight_liner:        C.red,
  acquiescence_bias:     C.amber,
  central_tendency_bias: "#2563eb",
  normal:                C.green,
};

function PatternBadge({ pattern }) {
  const color = PATTERN_COLORS[pattern] ?? C.muted;
  const label = (pattern ?? "—").replace(/_/g, " ");
  return <Badge label={label} color={color} />;
}

function TabBias({ data }) {
  const patterns = Array.isArray(data?.response_patterns) ? data.response_patterns : [];
  const sorted = [...patterns].sort((a, b) => (a.stddev_answer ?? 0) - (b.stddev_answer ?? 0));

  const summary = patterns.reduce((acc, p) => {
    acc[p.pattern] = (acc[p.pattern] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {Object.entries(summary).map(([k, v]) => (
          <KpiCard key={k} label={k.replace(/_/g, " ")} value={v} color={PATTERN_COLORS[k] ?? C.navy} />
        ))}
        {Object.keys(summary).length === 0 && <p style={{ fontSize: 13, color: C.muted }}>No pattern data</p>}
      </div>

      <Card>
        <SectionTitle>Response Patterns (sorted by Std Dev ASC)</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {["Assessment #","Student","Mean","Std Dev","Range","All-5","All-4","All-3","All-2","All-1","Pattern"].map((h) => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0
                ? <tr><td colSpan={11} style={{ padding: 12, color: C.muted, textAlign: "center" }}>No data</td></tr>
                : sorted.map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}`, background: r.pattern === "straight_liner" ? "#fef2f2" : "transparent" }}>
                    <td style={{ padding: "6px 10px", fontFamily: "monospace" }}>{r.assessment_id ?? "—"}</td>
                    <td style={{ padding: "6px 10px", fontWeight: 600 }}>{r.student_name ?? "—"}</td>
                    <td style={{ padding: "6px 10px", fontFamily: "monospace" }}>{r.mean_answer?.toFixed(2) ?? "—"}</td>
                    <td style={{ padding: "6px 10px", fontFamily: "monospace", fontWeight: 700, color: (r.stddev_answer ?? 1) < 0.3 ? C.red : "inherit" }}>
                      {r.stddev_answer?.toFixed(3) ?? "—"}
                    </td>
                    <td style={{ padding: "6px 10px", fontFamily: "monospace" }}>{r.range_answer ?? "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>{r.count_5 ?? r.all_5 ?? "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>{r.count_4 ?? r.all_4 ?? "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>{r.count_3 ?? r.all_3 ?? "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>{r.count_2 ?? r.all_2 ?? "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>{r.count_1 ?? r.all_1 ?? "—"}</td>
                    <td style={{ padding: "6px 10px" }}><PatternBadge pattern={r.pattern} /></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionTitle>Pattern Explanations</SectionTitle>
        <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.6 }}>
          {[
            { pattern: "straight_liner", label: "Straight liner", desc: "Std dev < 0.3 — respondent gave nearly identical answers to all questions. Scores are unreliable.", color: C.red },
            { pattern: "acquiescence_bias", label: "Acquiescence bias", desc: "Mean > 3.8 — respondent consistently agreed with statements regardless of content.", color: C.amber },
            { pattern: "central_tendency_bias", label: "Central tendency bias", desc: "Almost all answers are 3 (neutral) — avoidance of extreme options.", color: "#2563eb" },
            { pattern: "normal", label: "Normal", desc: "Healthy variance across all 5 Likert points. Scores are reliable.", color: C.green },
          ].map(({ pattern, label, desc, color }) => (
            <div key={pattern} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <PatternBadge pattern={pattern} />
              <div style={{ color: C.muted }}>{desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Tab: Skill Scores ─────────────────────────────────────────────────────

function TabSkills({ data }) {
  const skillStats = Array.isArray(data?.skill_stats)
    ? [...data.skill_stats].sort((a, b) => (b.mean_hsi ?? 0) - (a.mean_hsi ?? 0))
    : [];
  const keyskillScores = Array.isArray(data?.keyskill_scores) ? data.keyskill_scores : [];
  const maxMean = Math.max(...skillStats.map((s) => s.mean_hsi ?? 0), 1);

  // Group keyskill scores by student
  const byStudent = keyskillScores.reduce((acc, row) => {
    const name = row.student_name ?? "Unknown";
    if (!acc[name]) acc[name] = [];
    acc[name].push(row);
    return acc;
  }, {});

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <KpiCard label="HSI Overflows" value={data?.overflow_hsi_count ?? "—"} color={(data?.overflow_hsi_count ?? 0) > 0 ? C.red : C.green} />
        <KpiCard label="Zero HSI Count" value={data?.zero_hsi_count ?? "—"} color={(data?.zero_hsi_count ?? 0) > 0 ? C.amber : C.green} />
        <KpiCard label="CPS Locked" value={data?.cps_stats?.is_locked ? "YES" : "NO"} color={data?.cps_stats?.is_locked ? C.red : C.green} />
        {data?.cps_stats?.version && (
          <KpiCard label="CPS Version" value={data.cps_stats.version} color={C.navy} />
        )}
      </div>

      <Card>
        <SectionTitle>Skill Stats — Mean HSI (sorted DESC)</SectionTitle>
        {skillStats.length === 0
          ? <p style={{ fontSize: 13, color: C.muted }}>No skill data</p>
          : skillStats.map((s, i) => (
            <HBar
              key={i}
              label={s.skill_name ?? `Skill ${i}`}
              value={parseFloat((s.mean_hsi ?? 0).toFixed(2))}
              max={maxMean}
              color={(s.max_hsi ?? 0) > 100 ? C.red : C.teal}
              badge={(s.overflow_count ?? 0) > 0 ? `${s.overflow_count} overflow` : undefined}
              labelWidth={200}
            />
          ))
        }
      </Card>

      <Card>
        <SectionTitle>Keyskill Scores by Student</SectionTitle>
        {Object.keys(byStudent).length === 0
          ? <p style={{ fontSize: 13, color: C.muted }}>No keyskill data</p>
          : Object.entries(byStudent).map(([student, rows]) => (
            <div key={student} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: C.navy }}>{student}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {rows.map((r, i) => (
                  <span key={i} style={{
                    borderRadius: 999, border: `1px solid ${C.border}`,
                    padding: "3px 10px", fontSize: 12,
                    background: C.bg,
                  }}>
                    {r.keyskill}: <b>{r.score?.toFixed ? r.score.toFixed(2) : r.score}</b>
                  </span>
                ))}
              </div>
            </div>
          ))
        }
      </Card>
    </div>
  );
}

// ── Tab: Career Recs ──────────────────────────────────────────────────────

const CLUSTER_COLORS = [
  "#0d9488","#2563eb","#7c3aed","#db2777","#d97706","#16a34a","#0284c7","#9333ea","#e11d48","#059669",
];

function TabCareers({ data }) {
  const careerFreq = Array.isArray(data?.career_frequency)
    ? [...data.career_frequency].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 20)
    : [];
  const rank1 = Array.isArray(data?.rank1_careers)
    ? [...data.rank1_careers].sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    : [];
  const clusterDist = Array.isArray(data?.cluster_distribution) ? data.cluster_distribution : [];
  const streamDist = Array.isArray(data?.stream_distribution) ? data.stream_distribution : [];

  const maxFreq = Math.max(...careerFreq.map((r) => r.count ?? 0), 1);
  const totalRank1 = rank1.reduce((s, r) => s + (r.count ?? 0), 0);
  const maxRank1 = Math.max(...rank1.map((r) => r.count ?? 0), 1);
  const maxCluster = Math.max(...clusterDist.map((r) => r.count ?? 0), 1);
  const maxStream = Math.max(...streamDist.map((r) => r.count ?? 0), 1);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <SectionTitle>Top 20 Most Recommended Careers</SectionTitle>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Top 3 highlighted in red (over-represented)</div>
          {careerFreq.length === 0
            ? <p style={{ fontSize: 13, color: C.muted }}>No data</p>
            : careerFreq.map((r, i) => (
              <HBar
                key={i}
                label={r.career_title ?? r.title ?? `Career ${i+1}`}
                value={r.count ?? 0}
                max={maxFreq}
                color={i < 3 ? C.red : C.teal}
                labelWidth={160}
              />
            ))
          }
        </Card>

        <Card>
          <SectionTitle>Rank 1 Career Per Assessment</SectionTitle>
          {rank1.length === 0
            ? <p style={{ fontSize: 13, color: C.muted }}>No data</p>
            : rank1.map((r, i) => {
              const pct = totalRank1 > 0 ? Math.round((r.count / totalRank1) * 100) : 0;
              return (
                <div key={i}>
                  <HBar
                    label={r.career_title ?? r.title ?? `Career ${i+1}`}
                    value={r.count ?? 0}
                    max={maxRank1}
                    color={pct > 50 ? C.red : C.teal}
                    badge={pct > 50 ? `${pct}% dominant ⚠` : undefined}
                    labelWidth={160}
                  />
                </div>
              );
            })
          }
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <SectionTitle>Cluster Distribution</SectionTitle>
          {clusterDist.length === 0
            ? <p style={{ fontSize: 13, color: C.muted }}>No data</p>
            : clusterDist.map((r, i) => (
              <HBar
                key={i}
                label={r.cluster_name ?? r.cluster ?? `Cluster ${i+1}`}
                value={r.count ?? 0}
                max={maxCluster}
                color={CLUSTER_COLORS[i % CLUSTER_COLORS.length]}
                labelWidth={160}
              />
            ))
          }
        </Card>

        <Card>
          <SectionTitle>Stream Distribution</SectionTitle>
          {streamDist.length === 0
            ? <p style={{ fontSize: 13, color: C.muted }}>No data</p>
            : streamDist.map((r, i) => (
              <HBar key={i} label={r.stream ?? "—"} value={r.count ?? 0} max={maxStream} color={C.navy} labelWidth={120} />
            ))
          }
        </Card>
      </div>
    </div>
  );
}

// ── Tab: Issues Tracker ───────────────────────────────────────────────────

const ISSUE_STYLES = {
  critical: { borderColor: C.red,   bg: "#fef2f2", textColor: C.red },
  warning:  { borderColor: C.amber, bg: "#fffbeb", textColor: C.amber },
  info:     { borderColor: "#2563eb", bg: "#eff6ff", textColor: "#2563eb" },
};

function TabIssues({ data }) {
  const issues = Array.isArray(data?.data_issues) ? data.data_issues : [];
  const grouped = issues.reduce((acc, iss) => {
    const sev = iss.severity ?? "info";
    if (!acc[sev]) acc[sev] = [];
    acc[sev].push(iss);
    return acc;
  }, {});

  const order = ["critical", "warning", "info"];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {issues.length === 0 && (
        <Card><p style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: 20 }}>No issues found.</p></Card>
      )}
      {order.map((sev) => {
        const group = grouped[sev];
        if (!group?.length) return null;
        const s = ISSUE_STYLES[sev] ?? ISSUE_STYLES.info;
        return (
          <div key={sev}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10, color: s.textColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {sev} ({group.length})
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {group.map((iss, i) => (
                <div key={i} style={{
                  borderLeft: `4px solid ${s.borderColor}`,
                  background: s.bg,
                  borderRadius: "0 10px 10px 0",
                  padding: "12px 16px",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>{iss.title}</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{iss.detail}</div>
                  {iss.fix && (
                    <div style={{ fontSize: 12, color: C.teal, fontStyle: "italic", marginTop: 6 }}>
                      Fix: {iss.fix}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function AdminAnalyticsDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [lastRefreshed, setLastRefreshed] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPlatformAnalytics()
      .then(setData)
      .catch((err) => setError(err?.message ?? String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
          <div style={{ color: C.muted, fontSize: 14 }}>Loading platform analytics…</div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: "2rem", color: C.red }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Failed to load analytics</div>
        <div style={{ fontSize: 13 }}>{error}</div>
        <div style={{ marginTop: 8, fontSize: 13, color: C.muted }}>Make sure you are logged in as admin.</div>
        <button onClick={load} style={{ marginTop: 16, padding: "8px 16px", background: C.navy, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px", fontFamily: "inherit" }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: C.navy }}>Platform Analytics</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <span>Live from production DB{lastRefreshed && <span style={{marginLeft:'10px',color:'#0d9488'}}> · {lastRefreshed.toLocaleTimeString()}</span>}</span>
            <RefreshButton onRefresh={load} loading={loading} />
          </div>
        </div>
        <Link to="/admin" style={{ fontSize: 13, color: C.navy, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
          ← Admin Console
        </Link>
      </div>

      {/* Error banner (soft — data still shown from last fetch) */}
      {error && data && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fef2f2", border: `1px solid ${C.red}44`, borderRadius: 10, fontSize: 13, color: C.red }}>
          Refresh failed: {error}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: `2px solid ${C.border}`, flexWrap: "wrap" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "transparent",
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: 13,
              color: activeTab === tab.id ? C.navy : C.muted,
              borderBottom: activeTab === tab.id ? `2px solid ${C.navy}` : "2px solid transparent",
              marginBottom: -2,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div>
        {activeTab === "overview" && <TabOverview data={data} />}
        {activeTab === "funnel"   && <TabFunnel   data={data} />}
        {activeTab === "bias"     && <TabBias     data={data} />}
        {activeTab === "skills"   && <TabSkills   data={data} />}
        {activeTab === "careers"  && <TabCareers  data={data} />}
        {activeTab === "issues"   && <TabIssues   data={data} />}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.muted, display: "flex", justifyContent: "space-between" }}>
        <span>Admin — Platform Analytics</span>
        <Link to="/admin" style={{ color: C.muted, textDecoration: "none" }}>← Admin Console</Link>
      </div>
    </div>
  );
}
