// src/pages/admin/AdminEngineHealthPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import { apiGet } from "../../apiClient";

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────────────────────── */
function relativeTime(dateStr) {
  if (!dateStr) return "—";
  try {
    const ms   = Date.now() - new Date(dateStr).getTime();
    const secs = Math.floor(ms / 1000);
    if (secs < 60)  return "just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60)  return `${mins}m ago`;
    const hrs  = Math.floor(mins / 60);
    if (hrs  < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs  / 24);
    if (days < 30)  return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function getLast14Days() {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function formatChartDate(dateStr) {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-IN", {
      day: "2-digit", month: "short",
    });
  } catch {
    return dateStr;
  }
}

function formatDuration(seconds) {
  if (seconds == null) return "—";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m   = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

/* ─────────────────────────────────────────────────────────────────────────
   KPI CARD
────────────────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, accent = "#1e40af" }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid var(--border)",
      borderTop: `3px solid ${accent}`,
      borderRadius: 8,
      padding: "16px 18px",
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 30, fontWeight: 800, color: "var(--text-primary)",
        lineHeight: 1, wordBreak: "break-all",
      }}>
        {value}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   STATUS BREAKDOWN
────────────────────────────────────────────────────────────────────────── */
function StatusBreakdown({ completed, inProgress, abandoned }) {
  const total  = completed + inProgress + abandoned;
  const pct    = (n) => total > 0 ? ((n / total) * 100).toFixed(1) : "0.0";

  const rows = [
    { label: "Completed",   count: completed,  color: "#166534", bg: "#dcfce7" },
    { label: "In Progress", count: inProgress, color: "#1e40af", bg: "#dbeafe" },
    { label: "Abandoned",   count: abandoned,  color: "#64748b", bg: "#f1f5f9" },
  ];

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>
        Status Breakdown
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map(({ label, count, color }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                  {label}
                </span>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {count.toLocaleString()}
                <span style={{ fontSize: 10, marginLeft: 4 }}>({pct(count)}%)</span>
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: "#f1f5f9", overflow: "hidden" }}>
              <div style={{
                height: "100%", background: color,
                width: `${pct(count)}%`, borderRadius: 4,
                transition: "width 0.4s",
              }} />
            </div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 2 }}>
          Total: {total.toLocaleString()} assessments
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   TREND CHART — 14-day vertical bar chart using divs
────────────────────────────────────────────────────────────────────────── */
const BAR_MAX_H = 80; // px

function TrendChart({ chartData }) {
  const maxCount = Math.max(1, ...chartData.map(d => d.count));

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
        Assessment Trend — Last 14 Days
      </div>

      {/* Bar area */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, paddingBottom: 0 }}>
        {chartData.map(({ date, count, label }) => {
          const barH = count > 0 ? Math.max(4, Math.round((count / maxCount) * BAR_MAX_H)) : 2;
          return (
            <div
              key={date}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              {/* Count label above bar */}
              <div style={{
                fontSize: 8, color: "var(--text-muted)",
                height: 14, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {count > 0 ? count : ""}
              </div>

              {/* Bar */}
              <div
                title={`${label}: ${count} assessment${count !== 1 ? "s" : ""}`}
                style={{
                  width: "100%", maxWidth: 40,
                  height: barH,
                  borderRadius: "3px 3px 0 0",
                  background: count > 0 ? "var(--brand-primary)" : "#e2e8f0",
                  transition: "height 0.3s",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis baseline */}
      <div style={{ height: 1, background: "var(--border)", marginBottom: 4 }} />

      {/* Date labels */}
      <div style={{ display: "flex", gap: 3 }}>
        {chartData.map(({ date, label }) => (
          <div key={date} style={{
            flex: 1, fontSize: 8, color: "var(--text-muted)",
            textAlign: "center", lineHeight: 1.3,
            overflow: "hidden", whiteSpace: "nowrap",
          }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   TOP RECOMMENDED CLUSTERS
────────────────────────────────────────────────────────────────────────── */
const RANK_COLORS = ["#1e40af", "#0f766e", "#166534", "#92400e", "#64748b"];

function ClusterRanking({ clusters }) {
  const maxCount = Math.max(1, ...clusters.map(c => c.count ?? 0));

  if (clusters.length === 0) {
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
          Top Recommended Clusters
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No cluster data available.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>
        Top Recommended Clusters
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {clusters.map((c, i) => {
          const name  = c.cluster_name ?? c.name ?? `Cluster ${i + 1}`;
          const count = c.count ?? 0;
          const barW  = (count / maxCount) * 100;
          const rank  = RANK_COLORS[i] ?? "#64748b";

          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Rank badge */}
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                background: rank, color: "#fff",
                fontSize: 10, fontWeight: 700, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {i + 1}
              </div>

              {/* Cluster name */}
              <div style={{
                fontSize: 12, fontWeight: 600, color: "var(--text-primary)",
                minWidth: 140, flexShrink: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {name}
              </div>

              {/* Bar */}
              <div style={{ flex: 1, height: 12, background: "#f1f5f9", borderRadius: 6, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${barW}%`,
                  background: rank,
                  borderRadius: 6,
                  transition: "width 0.4s",
                }} />
              </div>

              {/* Count */}
              <div style={{
                fontSize: 12, fontWeight: 600, color: "var(--text-muted)",
                minWidth: 36, textAlign: "right", flexShrink: 0,
              }}>
                {count.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ENGINE STATUS CARD
────────────────────────────────────────────────────────────────────────── */
function EngineStatus({ configVersion, errorsToday, avgSeconds }) {
  const hasErrors  = errorsToday > 0;
  const errColor   = hasErrors ? "#dc2626" : "#166534";
  const errBg      = hasErrors ? "#fee2e2" : "#dcfce7";

  const rows = [
    {
      label: "Scoring Config",
      value: (
        <span style={{
          fontFamily: "monospace", fontSize: 12, fontWeight: 700,
          background: "#dbeafe", color: "#1e40af",
          padding: "2px 8px", borderRadius: 4,
        }}>
          {configVersion}
        </span>
      ),
    },
    {
      label: "Errors Today",
      value: (
        <span style={{
          fontSize: 12, fontWeight: 700,
          background: errBg, color: errColor,
          padding: "2px 8px", borderRadius: 4,
        }}>
          {errorsToday.toLocaleString()}
        </span>
      ),
    },
    {
      label: "Avg Completion",
      value: (
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          {formatDuration(avgSeconds)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>
        Engine Status
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map(({ label, value }) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
            {value}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE
────────────────────────────────────────────────────────────────────────── */
export default function AdminEngineHealthPage() {
  const [healthData,  setHealthData]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [lastFetched, setLastFetched] = useState(null);
  const [tick,        setTick]        = useState(0);

  /* ─── load ─── */
  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet("/v1/admin/engine/health");
      setHealthData(data ?? {});
      setLastFetched(Date.now());
    } catch (e) {
      setError(e.message || "Failed to load engine health.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  /* ─── 15-second tick for "last updated" display ─── */
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  /* ─── normalise API response (defensive) ─── */
  const d = healthData || {};

  const today      = d.assessments_today     ?? d.today_count    ?? 0;
  const week       = d.assessments_this_week ?? d.week_count     ?? 0;
  const total      = d.total_assessments     ?? d.total_count    ?? 0;
  const lastAt     = d.last_assessment_at    ?? d.last_at        ?? null;

  const breakdown  = d.status_breakdown ?? {};
  const completed  = breakdown.completed  ?? d.completed  ?? 0;
  const inProgress = breakdown.in_progress ?? d.in_progress ?? 0;
  const abandoned  = breakdown.abandoned  ?? d.abandoned  ?? 0;

  const daily    = Array.isArray(d.daily_trend)  ? d.daily_trend
                 : Array.isArray(d.daily_counts) ? d.daily_counts
                 : [];
  const clusters = (Array.isArray(d.top_clusters) ? d.top_clusters : []).slice(0, 5);

  const configVer   = d.scoring_config_version ?? d.config_version    ?? "—";
  const errorsToday = d.scoring_errors_today   ?? d.errors_today      ?? 0;
  const avgSeconds  = d.avg_completion_seconds  ?? d.avg_completion_time ?? null;

  /* ─── build 14-day chart data (fills missing days with 0) ─── */
  const dayMap   = Object.fromEntries(daily.map(e => [e.date, e.count ?? 0]));
  const chartData = getLast14Days().map(date => ({
    date,
    count: dayMap[date] ?? 0,
    label: formatChartDate(date),
  }));

  /* ─── "last updated" text (re-computes on each tick) ─── */
  const secondsAgo = tick >= 0 && lastFetched
    ? Math.floor((Date.now() - lastFetched) / 1000)
    : null;
  const lastUpdatedText = secondsAgo === null ? null
    : secondsAgo < 60 ? `${secondsAgo}s ago`
    : `${Math.floor(secondsAgo / 60)}m ${secondsAgo % 60}s ago`;

  /* ─── render ─── */
  return (
    <SkeletonPage
      title="Engine Health"
      subtitle="Scoring engine metrics and assessment pipeline status"
      loading={loading}
      error={!loading ? error : ""}
      onRetry={loadAll}
      actions={
        !loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {lastUpdatedText && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Updated {lastUpdatedText}
              </span>
            )}
            <Button size="sm" variant="secondary" onClick={loadAll}>
              Refresh
            </Button>
          </div>
        )
      }
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <Link to="/admin" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>
            ← Admin Console
          </Link>
          <Link to="/" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>
            ← Home
          </Link>
        </div>
      }
    >

      {/* ── KPI cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <KpiCard
          label="Assessments Today"
          value={today.toLocaleString()}
          accent="#1e40af"
        />
        <KpiCard
          label="This Week"
          value={week.toLocaleString()}
          accent="#0f766e"
        />
        <KpiCard
          label="Total Assessments"
          value={total.toLocaleString()}
          accent="#166534"
        />
        <KpiCard
          label="Last Assessment"
          value={relativeTime(lastAt)}
          accent="#92400e"
        />
      </div>

      {/* ── Main two-column grid: trend chart + right panel ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>

        {/* Trend chart */}
        <Card>
          <TrendChart chartData={chartData} />
        </Card>

        {/* Right column: status breakdown + engine status */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <StatusBreakdown
              completed={completed}
              inProgress={inProgress}
              abandoned={abandoned}
            />
          </Card>
          <Card>
            <EngineStatus
              configVersion={configVer}
              errorsToday={errorsToday}
              avgSeconds={avgSeconds}
            />
          </Card>
        </div>
      </div>

      {/* ── Top Clusters — full width ── */}
      <Card>
        <ClusterRanking clusters={clusters} />
      </Card>

    </SkeletonPage>
  );
}
