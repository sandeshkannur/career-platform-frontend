// src/pages/counsellor/CounsellorStudentDetailPage.jsx
import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import { apiGet } from "../../apiClient";

const COLOR = {
  navy: "var(--brand-primary)",
  teal: "#0d9488",
  amber: "#d97706",
  red: "#dc2626",
  green: "#16a34a",
  muted: "var(--text-muted)",
};

function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return String(iso);
  }
}

const microLabel = {
  fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4,
};

function Field({ label, children }) {
  return (
    <div>
      <div style={microLabel}>{label}</div>
      <div style={{ fontSize: 14 }}>{children}</div>
    </div>
  );
}

function fitBandColor(band) {
  return {
    high_potential: COLOR.green, strong: COLOR.teal,
    promising: COLOR.amber, developing: "#f59e0b", exploring: COLOR.red,
  }[band] || COLOR.muted;
}

function Bar({ value, max = 100, color = COLOR.teal }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ flex: 1, background: "var(--border)", borderRadius: 4, height: 10 }}>
      <div style={{ width: `${pct}%`, height: 10, borderRadius: 4, background: color }} />
    </div>
  );
}

const cardTitle = { margin: "0 0 14px", fontSize: "var(--font-size-lg)", fontWeight: 700 };
const emptyState = { color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0", margin: 0 };

// ── KPI strip ────────────────────────────────────────────────────────────

function KpiCard({ label, value, color = COLOR.navy }) {
  return (
    <div style={{ background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1, fontFamily: "monospace" }}>{value ?? "—"}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function KpiStrip({ summary }) {
  const s = summary || {};
  const kpis = [
    { v: s.total_assessments, l: "Total attempts" },
    { v: s.assessments_with_results, l: "With results", c: COLOR.green },
    { v: s.assessments_no_results, l: "No results", c: (s.assessments_no_results ?? 0) > 0 ? COLOR.red : undefined },
    { v: s.bias_flag_count, l: "Data quality flags", c: (s.bias_flag_count ?? 0) > 0 ? COLOR.amber : undefined },
    { v: s.dominant_career_pct != null ? `${s.dominant_career_pct}%` : "—", l: "Top career consistency" },
    { v: s.interest_inventory_done ? "Done" : "Not done", l: "Interest inventory", c: s.interest_inventory_done ? COLOR.green : COLOR.amber },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
      {kpis.map((k, i) => (
        <KpiCard key={i} label={k.l} value={k.v} color={k.c} />
      ))}
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "assessments", label: "Assessments" },
  { id: "skills", label: "Skills" },
  { id: "careers", label: "Career Matches" },
  { id: "keyskills", label: "Keyskills" },
  { id: "interest", label: "Interest & Context" },
  { id: "quality", label: "Data Quality" },
];

function TabBar({ active, onChange }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 16, flexWrap: "wrap" }}>
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: "8px 16px", fontSize: 13, fontWeight: active === t.id ? 700 : 500,
            border: "none", background: "transparent", cursor: "pointer",
            color: active === t.id ? COLOR.teal : "var(--text-muted)",
            borderBottom: active === t.id ? `2px solid ${COLOR.teal}` : "2px solid transparent",
            marginBottom: -1, fontFamily: "inherit",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Tab: Overview ────────────────────────────────────────────────────────

function OverviewTab({ student, assignment }) {
  return (
    <>
      <Card>
        <h2 style={cardTitle}>Student</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <Field label="Name">{student?.name || "—"}</Field>
          <Field label="Grade">{student?.grade != null ? student.grade : "—"}</Field>
          <Field label="Student ID">
            <span style={{ fontFamily: "monospace" }}>#{student?.student_id}</span>
          </Field>
        </div>
      </Card>

      <div style={{ height: 16 }} />

      <Card>
        <h2 style={cardTitle}>Assignment</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <Field label="Type">
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
              background: assignment.assignment_type === "self_claimed" ? "#fef3c7" : "#dbeafe",
              color: assignment.assignment_type === "self_claimed" ? "#92400e" : "#1e40af",
            }}>
              {(assignment.assignment_type || "—").replace(/_/g, " ")}
            </span>
          </Field>
          <Field label="Assigned At">{fmtDateTime(assignment.assigned_at)}</Field>
        </div>
      </Card>
    </>
  );
}

// ── Tab: Assessments (section_a_timeline) ───────────────────────────────

function AssessmentsTab({ timeline }) {
  const rows = Array.isArray(timeline) ? timeline : [];
  return (
    <Card>
      <h2 style={cardTitle}>Assessment History</h2>
      {rows.length === 0 ? (
        <p style={emptyState}>No assessment attempts yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                {["ID", "Date", "Responses", "Results", "Pattern", "Mean", "Std Dev"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.assessment_id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>#{row.assessment_id}</td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{fmtDate(row.submitted_at)}</td>
                  <td style={{ padding: "8px 10px", color: row.response_count < 45 ? COLOR.red : "inherit" }}>
                    {row.response_count}
                  </td>
                  <td style={{ padding: "8px 10px", color: row.has_results ? COLOR.green : COLOR.red }}>
                    {row.has_results ? "✓" : "✗"}
                  </td>
                  <td style={{ padding: "8px 10px" }}>{(row.pattern || "—").replace(/_/g, " ")}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>{row.mean_answer ?? "—"}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>{row.stddev_answer ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── Tab: Skills (section_b_skill_profile + section_b_platform_avg) ─────

function SkillsTab({ skillProfile, platformAvg }) {
  const skills = Array.isArray(skillProfile) ? skillProfile : [];
  const avgLookup = Array.isArray(platformAvg) ? platformAvg : [];

  return (
    <Card>
      <h2 style={cardTitle}>Skill Profile</h2>
      {skills.length === 0 ? (
        <p style={emptyState}>No skill scores computed for this student yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {skills.map((skill) => {
            const avg = avgLookup.find((p) => p.skill === skill.skill);
            const color = fitBandColor(skill.fit_band);
            return (
              <div key={skill.skill}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 13, minWidth: 180 }}>{skill.skill}</div>
                  <Bar value={skill.mean_hsi} color={color} />
                  <div style={{ fontSize: 13, fontFamily: "monospace", minWidth: 40, textAlign: "right", color }}>
                    {skill.mean_hsi}
                  </div>
                  {avg && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 70 }}>
                      platform avg: {avg.platform_mean}
                    </div>
                  )}
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: color + "22", color }}>
                    {(skill.fit_band || "—").replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Tab: Career Matches (section_c_career_stability) ────────────────────

function CareerMatchesTab({ stability }) {
  const stable = Array.isArray(stability?.stable_careers) ? stability.stable_careers : [];
  const history = Array.isArray(stability?.rank1_history) ? stability.rank1_history : [];

  return (
    <>
      <Card>
        <h2 style={cardTitle}>Stable Career Matches</h2>
        {stable.length === 0 ? (
          <p style={emptyState}>Not enough completed assessments yet to judge stability.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {stable.map((c) => (
              <div key={c.career_title} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 13, minWidth: 180 }}>{c.career_title}</div>
                <Bar value={c.stability_pct} color={COLOR.green} />
                <div style={{ fontSize: 13, fontFamily: "monospace", minWidth: 40, textAlign: "right", color: COLOR.green }}>
                  {c.stability_pct}%
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ height: 16 }} />

      <Card>
        <h2 style={cardTitle}>Top Career Per Attempt</h2>
        {history.length === 0 ? (
          <p style={emptyState}>No completed results yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                  {["Date", "Top Career", "Cluster"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.assessment_id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{fmtDate(r.submitted_at)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{r.rank1_career}</td>
                    <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>{r.rank1_cluster}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

// ── Tab: Keyskills (section_d_keyskills) — real numeric scores ──────────

function KeyskillsTab({ keyskills }) {
  const rows = Array.isArray(keyskills) ? keyskills : [];
  return (
    <Card>
      <h2 style={cardTitle}>Keyskill Scores</h2>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -8, marginBottom: 14 }}>
        Numeric scores are visible to counsellors only — students never see raw numbers.
      </p>
      {rows.length === 0 ? (
        <p style={emptyState}>No keyskill scores computed for this student yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((ks) => {
            const color = fitBandColor(ks.fit_band);
            return (
              <div key={ks.keyskill} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 13, minWidth: 200 }}>{ks.keyskill}</div>
                <Bar value={ks.score} color={color} />
                <div style={{ fontSize: 13, fontFamily: "monospace", minWidth: 40, textAlign: "right", color }}>
                  {ks.score}
                </div>
                <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: color + "22", color }}>
                  {(ks.fit_band || "—").replace(/_/g, " ")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Tab: Interest & Context (section_f_interest + section_g_context) ───

function InterestContextTab({ interest, context }) {
  const completed = !!interest?.completed;
  const topClusters = Array.isArray(interest?.top_clusters) ? interest.top_clusters : [];

  return (
    <>
      <Card>
        <h2 style={cardTitle}>Interest Inventory</h2>
        {!completed ? (
          <p style={{ ...emptyState, color: COLOR.amber, textAlign: "left" }}>
            Interest inventory not completed. Career cluster boosts have not been applied.
          </p>
        ) : (
          <>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Completed {fmtDate(interest?.completed_at)} · Language: {interest?.lang || "—"}
            </div>
            {topClusters.length === 0 ? (
              <p style={emptyState}>No cluster boosts recorded.</p>
            ) : (
              <div style={{ display: "grid", gap: 4 }}>
                {topClusters.map((cl, i) => (
                  <div key={cl} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "6px 10px", background: i % 2 === 0 ? "var(--bg-app)" : "transparent",
                    fontSize: 13, borderRadius: 6,
                  }}>
                    <span>{cl}</span>
                    <span style={{ fontFamily: "monospace", color: COLOR.teal }}>
                      +{((interest?.cluster_boosts?.[cl] || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      <div style={{ height: 16 }} />

      <Card>
        <h2 style={cardTitle}>Context Profile</h2>
        {!context ? (
          <p style={emptyState}>No context profile recorded.</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
              {[
                ["SES Band", context.ses_band],
                ["Education Board", context.education_board],
                ["Support Level", context.support_level],
                ["Resource Access", context.resource_access],
              ].map(([label, val]) => (
                <div key={label} style={{ background: "var(--bg-app)", padding: "8px 12px", borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: val === "unknown" || !val ? COLOR.amber : "inherit" }}>
                    {val || "unknown"}
                  </div>
                </div>
              ))}
            </div>
            <div style={{
              background: context.context_filled ? "#f0fdf4" : "#fffbeb",
              border: `1px solid ${context.context_filled ? "#bbf7d0" : "#fde68a"}`,
              borderRadius: 8, padding: "10px 14px",
            }}>
              <div style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 15 }}>
                CPS: {context.cps_score ?? "—"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                {context.cps_interpretation}
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

// ── Tab: Data Quality (section_e_bias_flags) — reworded for counsellors ─

const BIAS_COPY = {
  straight_liner: "This student answered nearly every question the same way. The results may not reflect them accurately — consider asking them to retake the assessment.",
  acquiescence_bias: "This student tended to agree with most statements. Their strengths may appear higher than they are.",
  disacquiescence_bias: "This student tended to disagree with most statements. Their strengths may appear lower than they are.",
  central_tendency_bias: "This student mostly chose middle answers, so their strongest and weakest areas are hard to distinguish. Consider a retake.",
};

function biasHeadline(pattern) {
  return BIAS_COPY[pattern]
    || "This assessment attempt showed an unusual answering pattern. Consider reviewing it with the student, or asking them to retake the assessment.";
}

function DataQualityTab({ flags, timeline }) {
  const rows = Array.isArray(flags) ? flags : [];
  const timelineRows = Array.isArray(timeline) ? timeline : [];

  return (
    <Card>
      <h2 style={cardTitle}>Data Quality</h2>
      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COLOR.green }}>
            ✓ No data quality concerns
          </p>
          <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
            This student's assessment responses look reliable.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((flag) => {
            const date = timelineRows.find((t) => t.assessment_id === flag.assessment_id)?.submitted_at;
            return (
              <div key={flag.assessment_id} style={{
                borderLeft: `3px solid ${COLOR.amber}`, background: "#fffbeb",
                borderRadius: "0 8px 8px 0", padding: "12px 14px",
              }}>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{biasHeadline(flag.pattern)}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                  From the attempt on {fmtDate(date)}
                </div>
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: 12, color: COLOR.teal, cursor: "pointer" }}>
                    Why we're flagging this
                  </summary>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.6 }}>
                    Pattern: {(flag.pattern || "—").replace(/_/g, " ")}<br />
                    Mean answer: {flag.mean_answer ?? "—"} · Std deviation: {flag.stddev_answer ?? "—"}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function CounsellorStudentDetailPage() {
  const { studentId } = useParams();
  const [basic, setBasic] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { status, message }
  const [activeTab, setActiveTab] = useState("overview");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [basicData, analyticsData] = await Promise.all([
        apiGet(`/v1/counsellor/students/${studentId}`),
        apiGet(`/v1/counsellor/students/${studentId}/analytics`),
      ]);
      setBasic(basicData);
      setAnalytics(analyticsData);
    } catch (e) {
      setError({ status: e.status, message: e.message || "Failed to load student." });
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const backLink = (
    <Link to="/counsellor/caseload" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>
      ← My Caseload
    </Link>
  );

  if (loading) {
    return (
      <Card>
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px 0", margin: 0 }}>
          Loading student…
        </p>
      </Card>
    );
  }

  // 403: not assigned to this counsellor — friendly, deliberate message, shown
  // instead of any tab content so it can never be mistaken for a crash.
  if (error?.status === 403) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            You don't have access to this student
          </p>
          <p style={{ margin: "8px 0 16px", color: "var(--text-muted)", fontSize: 14 }}>
            Only students actively assigned to you are visible here.
          </p>
          {backLink}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <p style={{ color: "#dc2626", fontSize: 14, margin: "0 0 12px" }}>
            {error.status === 404 ? "Student not found." : error.message}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
            <Button variant="secondary" onClick={load}>Retry</Button>
            {backLink}
          </div>
        </div>
      </Card>
    );
  }

  const student = analytics?.student ?? basic ?? {};
  const assignment = basic?.assignment ?? {};

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        {backLink}
        <h1 style={{ margin: "8px 0 0", fontSize: "var(--font-size-2xl)", fontWeight: 800 }}>
          {basic?.name || student?.name || `Student #${basic?.student_id ?? studentId}`}
        </h1>
      </div>

      <KpiStrip summary={analytics?.summary} />

      <TabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" && <OverviewTab student={basic} assignment={assignment} />}
      {activeTab === "assessments" && <AssessmentsTab timeline={analytics?.section_a_timeline} />}
      {activeTab === "skills" && (
        <SkillsTab skillProfile={analytics?.section_b_skill_profile} platformAvg={analytics?.section_b_platform_avg} />
      )}
      {activeTab === "careers" && <CareerMatchesTab stability={analytics?.section_c_career_stability} />}
      {activeTab === "keyskills" && <KeyskillsTab keyskills={analytics?.section_d_keyskills} />}
      {activeTab === "interest" && (
        <InterestContextTab interest={analytics?.section_f_interest} context={analytics?.section_g_context} />
      )}
      {activeTab === "quality" && (
        <DataQualityTab flags={analytics?.section_e_bias_flags} timeline={analytics?.section_a_timeline} />
      )}
    </>
  );
}
