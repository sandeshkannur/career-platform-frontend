// src/pages/admin/AdminSimulatorPage.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import { apiGet, apiPost } from "../../apiClient";

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────────────────────── */
const INPUT_CLS = [
  "rounded-md border border-[var(--border)] bg-white px-3 py-2",
  "text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]",
  "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1",
].join(" ");

const AQ_GROUPS = [
  { id: "g1", label: "AQ 01-05", traits: "Curiosity, Inquiry, Evidence, Analysis, Pattern",               color: "#1e40af" },
  { id: "g2", label: "AQ 06-09", traits: "Logic, Systems, Abstraction, Ideas",                           color: "#0f766e" },
  { id: "g3", label: "AQ 10-14", traits: "Experimentation, Solutioning, Attention, Precision, Planning",  color: "#166534" },
  { id: "g4", label: "AQ 15-18", traits: "Goal, Persistence, Self-Discipline, Flexibility",              color: "#92400e" },
  { id: "g5", label: "AQ 19-22", traits: "Feedback, Emotional Insight, Stress, Perspective",             color: "#7c3aed" },
  { id: "g6", label: "AQ 23-25", traits: "Cooperation, Integrity, Communication",                        color: "#be185d" },
];

const PERSONAS = [
  { id: "stem",       label: "STEM Explorer",    desc: "Strong cognitive, weak emotional",
    ranges: [{min:4,max:5},{min:4,max:5},{min:3,max:4},{min:2,max:3},{min:1,max:2},{min:2,max:3}] },
  { id: "creative",   label: "Creative Artist",   desc: "Strong emotional/social, weak analytical",
    ranges: [{min:1,max:2},{min:1,max:2},{min:2,max:3},{min:3,max:4},{min:4,max:5},{min:4,max:5}] },
  { id: "business",   label: "Business Leader",   desc: "Strong behavioral/drive, moderate cognitive",
    ranges: [{min:3,max:4},{min:3,max:4},{min:3,max:4},{min:4,max:5},{min:3,max:4},{min:3,max:4}] },
  { id: "healthcare", label: "Healthcare Helper", desc: "Moderate all, strong emotional",
    ranges: [{min:3,max:4},{min:2,max:3},{min:3,max:4},{min:3,max:4},{min:4,max:5},{min:3,max:4}] },
  { id: "balanced",   label: "Balanced",          desc: "All moderate (3-4)",
    ranges: [{min:3,max:4},{min:3,max:4},{min:3,max:4},{min:3,max:4},{min:3,max:4},{min:3,max:4}] },
  { id: "random",     label: "Random",            desc: "Fully random (1-5)",
    ranges: [{min:1,max:5},{min:1,max:5},{min:1,max:5},{min:1,max:5},{min:1,max:5},{min:1,max:5}] },
  { id: "low",        label: "Low Confidence",    desc: "All low (1-2)",
    ranges: [{min:1,max:2},{min:1,max:2},{min:1,max:2},{min:1,max:2},{min:1,max:2},{min:1,max:2}] },
];

const SIM_STEPS = [
  "Authenticating",
  "Creating assessment",
  "Answering 50 questions",
  "Submitting",
  "Scoring",
  "Fetching results",
];

// Cumulative ms before advancing to step N+1 while API is in flight
const STEP_DELAYS = [400, 1200, 3200, 3700, 4600, 5400];

const FIT_BAND = {
  high_potential: { bg: "#dcfce7", color: "#166534", label: "High Potential" },
  strong_fit:     { bg: "#dbeafe", color: "#1e40af", label: "Strong Fit" },
  promising:      { bg: "#fef9c3", color: "#854d0e", label: "Promising" },
  developing:     { bg: "#fed7aa", color: "#9a3412", label: "Developing" },
  exploring:      { bg: "#f1f5f9", color: "#475569", label: "Exploring" },
};

const PERSONA_BADGE = {
  stem:       { bg: "#dbeafe", color: "#1e40af" },
  creative:   { bg: "#fae8ff", color: "#7e22ce" },
  business:   { bg: "#fef9c3", color: "#854d0e" },
  healthcare: { bg: "#dcfce7", color: "#166534" },
  balanced:   { bg: "#f0f9ff", color: "#0369a1" },
  random:     { bg: "#f1f5f9", color: "#475569" },
  low:        { bg: "#fee2e2", color: "#991b1b" },
  custom:     { bg: "#f3f4f6", color: "#374151" },
  mixed:      { bg: "#f5f3ff", color: "#5b21b6" },
};

const EMPTY_CUSTOM_RANGES = AQ_GROUPS.map(() => ({ min: "1", max: "5" }));

const ML_TARGETS = [
  { id: "ML05", label: "ML05 Student Fit Profiles", target: 50,  color: "#166534" },
  { id: "ML09", label: "ML09 Early Prediction",     target: 100, color: "#1e40af" },
];

const CLUSTER_COLORS = ["#1e40af","#0f766e","#166534","#92400e","#7c3aed","#be185d"];

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────────────────────── */
function tabStyle(active) {
  return {
    padding: "8px 20px", fontSize: 14, fontWeight: active ? 700 : 500,
    border: "none", background: "transparent", cursor: "pointer",
    color: active ? "var(--brand-primary)" : "var(--text-muted)",
    borderBottom: active ? "2px solid var(--brand-primary)" : "2px solid transparent",
    marginBottom: -2, transition: "all 0.15s", fontFamily: "inherit",
  };
}

function modeTabStyle(active) {
  return {
    padding: "5px 12px", fontSize: 12, fontWeight: active ? 700 : 500,
    border: "1px solid", borderRadius: 6,
    borderColor: active ? "var(--brand-primary)" : "var(--border)",
    background: active ? "#eff6ff" : "#fff",
    color: active ? "var(--brand-primary)" : "var(--text-muted)",
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.1s",
  };
}

function fmtTime() {
  return new Date().toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/* ─────────────────────────────────────────────────────────────────────────
   AQ RANGE PREVIEW — 6 color bars, width = midpoint/5
────────────────────────────────────────────────────────────────────────── */
function AQRangePreview({ ranges }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {AQ_GROUPS.map((grp, i) => {
        const r   = ranges[i] ?? { min: 1, max: 5 };
        const mid = (Number(r.min) + Number(r.max)) / 2;
        const pct = (mid / 5) * 100;
        return (
          <div key={grp.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 54, fontSize: 9, fontWeight: 700, color: grp.color, flexShrink: 0, letterSpacing: "0.02em" }}>
              {grp.label}
            </div>
            <div style={{ flex: 1, height: 14, borderRadius: 3, background: "#f1f5f9", overflow: "hidden", position: "relative" }}>
              <div style={{
                height: "100%", borderRadius: 3, background: grp.color, opacity: 0.85,
                width: `${pct}%`, transition: "width 0.3s",
                display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4,
              }}>
                {pct >= 25 && (
                  <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>
                    {Number(r.min)}–{Number(r.max)}
                  </span>
                )}
              </div>
              {pct < 25 && (
                <span style={{
                  position: "absolute", left: `calc(${pct}% + 4px)`, top: "50%",
                  transform: "translateY(-50%)", fontSize: 9, color: "var(--text-muted)", fontWeight: 700,
                }}>
                  {Number(r.min)}–{Number(r.max)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   STEPS DISPLAY
────────────────────────────────────────────────────────────────────────── */
function StepsDisplay({ currentStep }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {SIM_STEPS.map((label, i) => {
        const done    = i < currentStep;
        const active  = i === currentStep;
        const pending = i > currentStep;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, opacity: pending ? 0.3 : 1, transition: "opacity 0.3s" }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700,
              background: done ? "#dcfce7" : active ? "#dbeafe" : "#f1f5f9",
              border: `2px solid ${done ? "#86efac" : active ? "#93c5fd" : "#e2e8f0"}`,
              color: done ? "#166534" : active ? "#1e40af" : "var(--text-muted)",
            }}>
              {done ? "✓" : active ? "●" : (i + 1)}
            </div>
            <span style={{ fontSize: 13, fontWeight: active ? 700 : done ? 400 : 400, color: active ? "var(--text-primary)" : "var(--text-muted)" }}>
              {label}
              {active && <span style={{ marginLeft: 5, fontSize: 11, color: "#1e40af" }}>in progress…</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   RESULTS CARD
────────────────────────────────────────────────────────────────────────── */
function ResultsCard({ result, onRunAgain }) {
  const careers     = Array.isArray(result.careers ?? result.top_careers) ? (result.careers ?? result.top_careers) : [];
  const topClusters = Array.isArray(result.top_clusters) ? result.top_clusters : [];
  const ctx         = result.context_profile ?? result.context ?? {};
  const duration    = result.duration_seconds ?? result.duration;
  const aid         = result.assessment_id ?? result.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, background: "#dcfce7", border: "1px solid #86efac" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>✓ Assessment Complete</div>
          {aid && (
            <div style={{ fontSize: 11, color: "#166534", marginTop: 2 }}>
              ID: <span style={{ fontFamily: "monospace" }}>{aid}</span>
              {duration != null && <span style={{ marginLeft: 8 }}>· {typeof duration === "number" ? `${duration.toFixed(1)}s` : duration}</span>}
            </div>
          )}
        </div>
        <Button size="sm" variant="secondary" onClick={onRunAgain}>Run Again</Button>
      </div>

      {/* Top clusters */}
      {topClusters.length > 0 && (
        <div>
          <div style={microLabel}>Top Clusters</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {topClusters.slice(0, 3).map((cl, i) => (
              <span key={i} style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700,
                background: (["#dbeafe","#dcfce7","#fef9c3"])[i] ?? "#f1f5f9",
                color:      (["#1e40af","#166534","#854d0e"])[i] ?? "#475569",
                border: `1px solid ${(["#93c5fd","#86efac","#fde68a"])[i] ?? "#e2e8f0"}`,
              }}>
                #{i + 1} {cl}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top careers */}
      {careers.length > 0 && (
        <div>
          <div style={microLabel}>Top {Math.min(9, careers.length)} Careers</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {careers.slice(0, 9).map((c, i) => {
              const fb = FIT_BAND[c.fit_band ?? c.band] ?? { bg: "#f1f5f9", color: "#475569", label: c.fit_band ?? "—" };
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 10px", borderRadius: 6,
                  background: i % 2 === 0 ? "#f8fafc" : "#fff",
                  border: "1px solid var(--border)",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", width: 18, textAlign: "right", flexShrink: 0 }}>
                    {c.rank ?? (i + 1)}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.title ?? c.career_title ?? `Career #${c.career_id}`}
                  </span>
                  {c.cluster_name && (
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: "#dbeafe", color: "#1e40af", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {c.cluster_name}
                    </span>
                  )}
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: fb.bg, color: fb.color, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {fb.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Context summary */}
      {Object.values(ctx).some(Boolean) && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f8fafc", border: "1px solid var(--border)" }}>
          <div style={microLabel}>Context Profile</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "var(--text-muted)" }}>
            {ctx.education_board && <span>Board: <strong>{ctx.education_board}</strong></span>}
            {ctx.ses_band        && <span>SES: <strong>{ctx.ses_band}</strong></span>}
            {ctx.cps_score != null && <span>CPS: <strong>{typeof ctx.cps_score === "number" ? ctx.cps_score.toFixed(2) : ctx.cps_score}</strong></span>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE
────────────────────────────────────────────────────────────────────────── */
export default function AdminSimulatorPage() {
  /* ── tab ── */
  const [tab, setTab] = useState("single");

  /* ── single: credentials ── */
  const [email,    setEmail]    = useState("teststudent1@mapyourcareer.in");
  const [password, setPassword] = useState("BetaTest@123");
  const [tier,     setTier]     = useState("free");

  /* ── single: AQ mode ── */
  const [aqMode,       setAqMode]       = useState("preset");
  const [personaId,    setPersonaId]    = useState("balanced");
  const [customRanges, setCustomRanges] = useState(EMPTY_CUSTOM_RANGES);

  /* ── single: context (collapsible) ── */
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctx,     setCtx]     = useState({ education_board: "", ses_band: "", support_level: "", resource_access: "" });

  /* ── single: execution ── */
  const [running,      setRunning]      = useState(false);
  const [currentStep,  setCurrentStep]  = useState(-1);
  const [runError,     setRunError]     = useState("");
  const [singleResult, setSingleResult] = useState(null);

  /* ── batch: config ── */
  const [batchCount,     setBatchCount]     = useState("10");
  const [batchPersona,   setBatchPersona]   = useState("balanced");
  const [batchTier,      setBatchTier]      = useState("free");
  const [createStudents, setCreateStudents] = useState(true);
  const [emailPrefix,    setEmailPrefix]    = useState("sim");

  /* ── batch: execution ── */
  const [batchRunning,  setBatchRunning]  = useState(false);
  const [batchFakePct,  setBatchFakePct]  = useState(0);
  const [batchError,    setBatchError]    = useState("");
  const [batchResults,  setBatchResults]  = useState([]);
  const [batchSortKey,  setBatchSortKey]  = useState("seq");
  const [batchSortDir,  setBatchSortDir]  = useState("asc");

  /* ── engine health ── */
  const [totalAssessments, setTotalAssessments] = useState(null);
  const [healthLoading,    setHealthLoading]    = useState(true);

  /* ── session history ── */
  const [history, setHistory] = useState([]);

  /* ─── load health count ─── */
  const loadHealth = useCallback(async () => {
    try {
      const data  = await apiGet("/v1/admin/engine/health");
      const total = data?.assessments_total ?? data?.total_assessments ?? data?.assessments ?? null;
      setTotalAssessments(typeof total === "number" ? total : null);
    } catch { /* non-fatal */ } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  /* ─── fake batch progress ticker ─── */
  useEffect(() => {
    if (!batchRunning) { setBatchFakePct(0); return; }
    const count    = Math.max(1, parseInt(batchCount) || 10);
    const estimated = count * 5000;
    let elapsed    = 0;
    const iv = setInterval(() => {
      elapsed += 300;
      setBatchFakePct(Math.min(0.93, elapsed / estimated));
    }, 300);
    return () => clearInterval(iv);
  }, [batchRunning, batchCount]);

  /* ─── active AQ ranges ─── */
  const activeRanges = useMemo(() => {
    if (aqMode === "preset") return PERSONAS.find(p => p.id === personaId)?.ranges ?? EMPTY_CUSTOM_RANGES;
    return customRanges.map(r => ({ min: parseInt(r.min) || 1, max: parseInt(r.max) || 5 }));
  }, [aqMode, personaId, customRanges]);

  const setRange = (idx, field, val) => {
    setCustomRanges(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };

  const rangeErrors = useMemo(() => {
    if (aqMode !== "custom") return {};
    const e = {};
    customRanges.forEach((r, i) => { if (parseInt(r.min) > parseInt(r.max)) e[i] = true; });
    return e;
  }, [aqMode, customRanges]);

  const hasRangeErrors = Object.keys(rangeErrors).length > 0;

  /* ─── single run ─── */
  const handleRunSingle = async () => {
    if (running || hasRangeErrors) return;
    setRunning(true);
    setCurrentStep(0);
    setRunError("");
    setSingleResult(null);

    const timers = STEP_DELAYS.map((delay, i) =>
      setTimeout(() => setCurrentStep(i + 1), delay)
    );

    const payload = {
      student_email: email, student_password: password, tier,
      aq_ranges: activeRanges,
      persona:   aqMode === "preset" ? personaId : "custom",
      context_profile: {
        education_board: ctx.education_board || null,
        ses_band:        ctx.ses_band        || null,
        support_level:   ctx.support_level   || null,
        resource_access: ctx.resource_access || null,
      },
    };

    try {
      const result = await apiPost("/v1/admin/simulate-assessment", payload);
      timers.forEach(clearTimeout);
      setCurrentStep(SIM_STEPS.length);
      setSingleResult(result);
      setHistory(h => [{
        time:       fmtTime(),
        type:       "single",
        persona:    aqMode === "preset" ? personaId : "custom",
        students:   1,
        topCluster: Array.isArray(result?.top_clusters) ? (result.top_clusters[0] ?? "—") : "—",
        status:     "success",
      }, ...h].slice(0, 50));
      loadHealth();
    } catch (e) {
      timers.forEach(clearTimeout);
      setCurrentStep(-1);
      setRunError(e.message || "Simulation failed.");
      setHistory(h => [{
        time: fmtTime(), type: "single",
        persona:   aqMode === "preset" ? personaId : "custom",
        students:  1, topCluster: "—",
        status: "error",
      }, ...h].slice(0, 50));
    } finally {
      setRunning(false);
    }
  };

  const handleResetSingle = () => {
    setSingleResult(null);
    setCurrentStep(-1);
    setRunError("");
  };

  /* ─── batch run ─── */
  const handleRunBatch = async () => {
    const count = Math.min(50, Math.max(1, parseInt(batchCount) || 10));
    setBatchRunning(true);
    setBatchError("");
    setBatchResults([]);

    try {
      const raw     = await apiPost("/v1/admin/simulate-batch", { count, persona: batchPersona, tier: batchTier, create_students: createStudents, email_prefix: emailPrefix });
      const results = Array.isArray(raw) ? raw : (raw?.results ?? []);
      setBatchFakePct(1);
      setBatchResults(results);
      setHistory(h => [{
        time: fmtTime(), type: "batch", persona: batchPersona,
        students:   count,
        topCluster: results[0]?.top_cluster ?? results[0]?.cluster_name ?? "—",
        status:     "success",
      }, ...h].slice(0, 50));
      loadHealth();
    } catch (e) {
      setBatchError(e.message || "Batch simulation failed.");
      setHistory(h => [{
        time: fmtTime(), type: "batch", persona: batchPersona,
        students: parseInt(batchCount) || 10, topCluster: "—", status: "error",
      }, ...h].slice(0, 50));
    } finally {
      setBatchRunning(false);
    }
  };

  /* ─── batch sort ─── */
  const sortedBatch = useMemo(() => {
    if (!batchResults.length) return [];
    return [...batchResults].sort((a, b) => {
      let av = a[batchSortKey] ?? (batchSortKey === "seq" ? 0 : "");
      let bv = b[batchSortKey] ?? (batchSortKey === "seq" ? 0 : "");
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return batchSortDir === "asc" ? cmp : -cmp;
    });
  }, [batchResults, batchSortKey, batchSortDir]);

  const toggleSort = (key) => {
    if (batchSortKey === key) setBatchSortDir(d => d === "asc" ? "desc" : "asc");
    else { setBatchSortKey(key); setBatchSortDir("asc"); }
  };
  const sortArrow = (key) => batchSortKey === key ? (batchSortDir === "asc" ? " ↑" : " ↓") : "";

  /* ─── batch stats ─── */
  const batchStats = useMemo(() => {
    if (!batchResults.length) return null;
    const succeeded = batchResults.filter(r => r.status !== "error" && r.status !== "failed").length;
    const failed    = batchResults.length - succeeded;
    const clusterCount = {};
    batchResults.forEach(r => {
      const cl = r.top_cluster ?? r.cluster_name ?? "Unknown";
      clusterCount[cl] = (clusterCount[cl] || 0) + 1;
    });
    const clusters = Object.entries(clusterCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const durations = batchResults.map(r => r.duration_seconds ?? r.duration).filter(d => typeof d === "number");
    const avgDuration = durations.length ? durations.reduce((s, d) => s + d, 0) / durations.length : null;
    return { succeeded, failed, clusters, avgDuration };
  }, [batchResults]);

  const maxClusterCount = batchStats ? Math.max(...batchStats.clusters.map(c => c[1]), 1) : 1;

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────── */
  return (
    <SkeletonPage
      title="Assessment Simulator"
      subtitle="Run synthetic assessments to generate training data for ML models"
      maxWidth="1400px"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <Link to="/admin" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>← Admin Console</Link>
          <Link to="/"     style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>← Home</Link>
        </div>
      }
    >
      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: 20 }}>
        <button style={tabStyle(tab === "single")} onClick={() => setTab("single")}>Single Run</button>
        <button style={tabStyle(tab === "batch")}  onClick={() => setTab("batch")}>Batch Run</button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1 — SINGLE RUN
          ══════════════════════════════════════════════════════════ */}
      {tab === "single" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

          {/* ── Left: config ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Credentials */}
            <Card>
              <div style={ST}>Student Credentials</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={LB}>Email</label>
                  <input className={INPUT_CLS} style={{ width: "100%", boxSizing: "border-box" }}
                    value={email} onChange={e => setEmail(e.target.value)} placeholder="student@example.com" />
                </div>
                <div>
                  <label style={LB}>Password</label>
                  <input type="password" className={INPUT_CLS} style={{ width: "100%", boxSizing: "border-box" }}
                    value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div>
                  <label style={LB}>Tier</label>
                  <select className={INPUT_CLS} style={{ width: "100%", boxSizing: "border-box" }}
                    value={tier} onChange={e => setTier(e.target.value)}>
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* AQ Config */}
            <Card>
              <div style={ST}>AQ Score Configuration</div>

              {/* Mode toggle */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                <button style={modeTabStyle(aqMode === "preset")} onClick={() => setAqMode("preset")}>Preset Persona</button>
                <button style={modeTabStyle(aqMode === "custom")} onClick={() => setAqMode("custom")}>Custom AQ Ranges</button>
              </div>

              {/* Preset mode */}
              {aqMode === "preset" && (
                <div>
                  <label style={LB}>Persona</label>
                  <select className={INPUT_CLS} style={{ width: "100%", boxSizing: "border-box", marginBottom: 14 }}
                    value={personaId} onChange={e => setPersonaId(e.target.value)}>
                    {PERSONAS.map(p => <option key={p.id} value={p.id}>{p.label} — {p.desc}</option>)}
                  </select>
                  <div style={microLabel}>Score Range Preview</div>
                  <AQRangePreview ranges={activeRanges} />
                </div>
              )}

              {/* Custom mode */}
              {aqMode === "custom" && (
                <div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                    {AQ_GROUPS.map((grp, i) => (
                      <div key={grp.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 10px", borderRadius: 6,
                        border: `1px solid ${rangeErrors[i] ? "#fca5a5" : "var(--border)"}`,
                        background: rangeErrors[i] ? "#fff5f5" : "#fafafa",
                        borderLeft: `3px solid ${grp.color}`,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: grp.color }}>{grp.label}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{grp.traits}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Min</span>
                          <select className={INPUT_CLS} style={{ width: 50, padding: "3px 5px" }}
                            value={customRanges[i].min} onChange={e => setRange(i, "min", e.target.value)}>
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Max</span>
                          <select className={INPUT_CLS} style={{ width: 50, padding: "3px 5px" }}
                            value={customRanges[i].max} onChange={e => setRange(i, "max", e.target.value)}>
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                          {rangeErrors[i] && <span style={{ fontSize: 12, color: "#dc2626" }}>⚠</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={microLabel}>Score Range Preview</div>
                  <AQRangePreview ranges={activeRanges} />
                  {hasRangeErrors && (
                    <p style={{ margin: "8px 0 0", fontSize: 11, color: "#dc2626" }}>⚠ Fix range errors: Min must be ≤ Max.</p>
                  )}
                </div>
              )}
            </Card>

            {/* Context profile (collapsible) */}
            <Card>
              <button
                onClick={() => setCtxOpen(o => !o)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit" }}
              >
                <span style={ST}>Context Profile</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{ctxOpen ? "▲ collapse" : "▼ optional"}</span>
              </button>

              {ctxOpen && (
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { key: "education_board", label: "Education Board",  opts: ["","CBSE","ICSE","State","IB","Cambridge","Other"] },
                    { key: "ses_band",        label: "SES Band",         opts: ["","careful","some","not_barrier","unknown"] },
                    { key: "support_level",   label: "Support Level",    opts: ["","low","medium","high","unknown"] },
                    { key: "resource_access", label: "Resource Access",  opts: ["","limited","moderate","good","unknown"] },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={LB}>{f.label}</label>
                      <select className={INPUT_CLS} style={{ width: "100%", boxSizing: "border-box" }}
                        value={ctx[f.key]} onChange={e => setCtx(c => ({ ...c, [f.key]: e.target.value }))}>
                        {f.opts.map(v => <option key={v} value={v}>{v || "— Not set —"}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Run button */}
            <Button size="lg" onClick={handleRunSingle} disabled={running || hasRangeErrors} style={{ width: "100%" }}>
              {running ? "Running…" : "Run Assessment"}
            </Button>
          </div>

          {/* ── Right: progress + results ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Idle */}
            {currentStep === -1 && !singleResult && !runError && (
              <div style={{ textAlign: "center", padding: "48px 20px", border: "2px dashed var(--border)", borderRadius: 10, color: "var(--text-muted)", fontSize: 13 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>⚡</div>
                <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>Ready to simulate</div>
                <div>Configure the student profile, then click "Run Assessment".</div>
              </div>
            )}

            {/* Steps (visible while running and after completion) */}
            {(running || (currentStep >= 0)) && !singleResult && (
              <Card>
                <div style={ST}>Simulation Progress</div>
                <StepsDisplay currentStep={currentStep} />
              </Card>
            )}

            {/* Error */}
            {runError && (
              <div style={{ padding: "12px 16px", borderRadius: 8, background: "#fee2e2", border: "1px solid #fca5a5", fontSize: 13, color: "#991b1b" }}>
                ⚠ {runError}
                <button onClick={handleResetSingle} style={{ marginLeft: 12, fontSize: 11, color: "#991b1b", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
                  Dismiss
                </button>
              </div>
            )}

            {/* Results */}
            {singleResult && (
              <>
                <Card>
                  <div style={ST}>Simulation Progress</div>
                  <StepsDisplay currentStep={SIM_STEPS.length} />
                </Card>
                <Card>
                  <ResultsCard result={singleResult} onRunAgain={handleResetSingle} />
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2 — BATCH RUN
          ══════════════════════════════════════════════════════════ */}
      {tab === "batch" && (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>

          {/* ── Batch config ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <div style={ST}>Batch Configuration</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                <div>
                  <label style={LB}>Count (1–50)</label>
                  <input type="number" min={1} max={50} className={INPUT_CLS}
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={batchCount} onChange={e => setBatchCount(e.target.value)} />
                </div>

                <div>
                  <label style={LB}>Persona</label>
                  <select className={INPUT_CLS} style={{ width: "100%", boxSizing: "border-box" }}
                    value={batchPersona} onChange={e => setBatchPersona(e.target.value)}>
                    {PERSONAS.map(p => <option key={p.id} value={p.id}>{p.label} — {p.desc}</option>)}
                    <option value="mixed">Mixed (rotate all)</option>
                  </select>
                </div>

                <div>
                  <label style={LB}>Tier</label>
                  <select className={INPUT_CLS} style={{ width: "100%", boxSizing: "border-box" }}
                    value={batchTier} onChange={e => setBatchTier(e.target.value)}>
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" id="createStudents" checked={createStudents}
                    onChange={e => setCreateStudents(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }} />
                  <label htmlFor="createStudents" style={{ fontSize: 13, cursor: "pointer" }}>Create test students</label>
                </div>

                <div>
                  <label style={LB}>Email Prefix</label>
                  <input className={INPUT_CLS} style={{ width: "100%", boxSizing: "border-box" }}
                    value={emailPrefix} onChange={e => setEmailPrefix(e.target.value)} placeholder="sim" />
                  <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4 }}>
                    <span style={{ fontFamily: "monospace" }}>{emailPrefix || "sim"}_YYYYMMDD_N@test.mapyourcareer.in</span>
                  </p>
                </div>
              </div>
            </Card>

            <Button size="lg" onClick={handleRunBatch} disabled={batchRunning} style={{ width: "100%" }}>
              {batchRunning ? "Running…" : "Run Batch"}
            </Button>
          </div>

          {/* ── Batch right side ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Idle */}
            {!batchRunning && batchResults.length === 0 && !batchError && (
              <div style={{ textAlign: "center", padding: "48px 20px", border: "2px dashed var(--border)", borderRadius: 10, color: "var(--text-muted)", fontSize: 13 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>⚡</div>
                <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>Ready for batch run</div>
                <div>Configure the batch on the left, then click "Run Batch".</div>
              </div>
            )}

            {/* Progress bar */}
            {batchRunning && (
              <Card>
                <div style={ST}>Running Batch of {parseInt(batchCount) || 10}…</div>
                <div style={{ height: 12, borderRadius: 6, background: "#e2e8f0", overflow: "hidden", marginBottom: 8 }}>
                  <div style={{
                    height: "100%", borderRadius: 6, background: "var(--brand-primary)",
                    width: `${(batchFakePct * 100).toFixed(1)}%`, transition: "width 0.5s",
                  }} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                  <span>Simulating {parseInt(batchCount) || 10} assessments…</span>
                  <span>{(batchFakePct * 100).toFixed(0)}%</span>
                </div>
              </Card>
            )}

            {/* Error */}
            {batchError && (
              <div style={{ padding: "12px 16px", borderRadius: 8, background: "#fee2e2", border: "1px solid #fca5a5", fontSize: 13, color: "#991b1b" }}>
                ⚠ {batchError}
              </div>
            )}

            {/* Summary cards */}
            {batchStats && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div style={{ background: "#fff", border: "1px solid var(--border)", borderTop: "3px solid #166534", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={microLabel}>Results</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#166534" }}>{batchStats.succeeded}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Succeeded{batchStats.failed > 0 && <span style={{ color: "#dc2626" }}> / {batchStats.failed} failed</span>}
                  </div>
                </div>
                <div style={{ background: "#fff", border: "1px solid var(--border)", borderTop: "3px solid #1e40af", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={microLabel}>Avg Duration</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#1e40af" }}>
                    {batchStats.avgDuration != null ? `${batchStats.avgDuration.toFixed(1)}s` : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>per simulation</div>
                </div>
                <div style={{ background: "#fff", border: "1px solid var(--border)", borderTop: "3px solid #7c3aed", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={microLabel}>Top Cluster</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed", lineHeight: 1.3 }}>
                    {batchStats.clusters[0]?.[0] ?? "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{batchStats.clusters[0]?.[1] ?? 0} occurrences</div>
                </div>
              </div>
            )}

            {/* Cluster distribution */}
            {batchStats && batchStats.clusters.length > 0 && (
              <Card>
                <div style={ST}>Cluster Distribution</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {batchStats.clusters.map(([cl, cnt], i) => (
                    <div key={cl} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 130, fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{cl}</div>
                      <div style={{ flex: 1, height: 10, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 3, transition: "width 0.4s",
                          width: `${(cnt / maxClusterCount) * 100}%`,
                          background: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
                        }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", width: 24, textAlign: "right" }}>{cnt}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Batch results table */}
            {sortedBatch.length > 0 && (
              <Card>
                <div style={ST}>Batch Results ({sortedBatch.length})</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                        {[
                          { key: "seq",           label: "#" },
                          { key: "email",         label: "Student Email" },
                          { key: "persona",       label: "Persona" },
                          { key: "top_career",    label: "Top Career" },
                          { key: "top_cluster",   label: "Top Cluster" },
                          { key: "fit_band",      label: "Fit Band" },
                          { key: "assessment_id", label: "Assessment ID" },
                        ].map(col => (
                          <th key={col.key} onClick={() => toggleSort(col.key)}
                            style={{ padding: "7px 8px", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}>
                            {col.label}{sortArrow(col.key)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBatch.map((row, i) => {
                        const pk = row.persona ?? batchPersona;
                        const pb = PERSONA_BADGE[pk] ?? { bg: "#f1f5f9", color: "#475569" };
                        const fb = FIT_BAND[row.fit_band ?? row.band] ?? null;
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-app)" }}>
                            <td style={{ padding: "7px 8px", color: "var(--text-muted)" }}>{row.seq ?? (i + 1)}</td>
                            <td style={{ padding: "7px 8px", fontFamily: "monospace", fontSize: 10, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {row.email ?? "—"}
                            </td>
                            <td style={{ padding: "7px 8px" }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: pb.bg, color: pb.color }}>{pk}</span>
                            </td>
                            <td style={{ padding: "7px 8px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {row.top_career ?? row.career_title ?? "—"}
                            </td>
                            <td style={{ padding: "7px 8px", color: "var(--text-muted)" }}>
                              {row.top_cluster ?? row.cluster_name ?? "—"}
                            </td>
                            <td style={{ padding: "7px 8px" }}>
                              {fb
                                ? <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: fb.bg, color: fb.color }}>{fb.label}</span>
                                : <span style={{ color: "var(--text-muted)" }}>—</span>
                              }
                            </td>
                            <td style={{ padding: "7px 8px", fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)" }}>
                              {row.assessment_id ?? row.id ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "2px solid var(--border)", background: "#f8fafc" }}>
                        <td colSpan={7} style={{ padding: "7px 8px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                          {batchStats?.succeeded ?? 0} succeeded · {batchStats?.failed ?? 0} failed · {sortedBatch.length} total
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          BOTTOM — always visible
          ══════════════════════════════════════════════════════════ */}
      <div style={{ marginTop: 28, paddingTop: 24, borderTop: "2px solid var(--border)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Data Progress */}
          <Card>
            <div style={ST}>Data Progress toward ML Targets</div>
            <div style={{ marginBottom: 16, display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: "var(--text-primary)" }}>
                {healthLoading ? "…" : (totalAssessments ?? "—")}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>total assessments</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {ML_TARGETS.map(ml => {
                const count  = totalAssessments ?? 0;
                const done   = count >= ml.target;
                const pct    = Math.min(100, (count / ml.target) * 100);
                const needed = Math.max(0, ml.target - count);
                return (
                  <div key={ml.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: done ? ml.color : "var(--text-primary)" }}>
                        {ml.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: done ? ml.color : "var(--text-muted)" }}>
                        {healthLoading ? "…" : `${count}/${ml.target}`}{done && " ✓"}
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: "#e2e8f0", overflow: "hidden", marginBottom: 4 }}>
                      <div style={{
                        height: "100%", borderRadius: 4, transition: "width 0.5s",
                        width: `${pct}%`,
                        background: done ? ml.color : "var(--brand-primary)",
                      }} />
                    </div>
                    {!done && totalAssessments != null && (
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>
                        Generate <strong>{needed}</strong> more assessment{needed !== 1 ? "s" : ""} to unlock {ml.id}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Session History */}
          <Card>
            <div style={ST}>Session History ({history.length})</div>
            {history.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No simulations run this session.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                      {["Time","Type","Persona","Students","Top Cluster","Status"].map(h => (
                        <th key={h} style={{ padding: "6px 8px", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 20).map((row, i) => {
                      const pb  = PERSONA_BADGE[row.persona] ?? { bg: "#f1f5f9", color: "#475569" };
                      const err = row.status !== "success";
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-app)" }}>
                          <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)" }}>{row.time}</td>
                          <td style={{ padding: "6px 8px" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                              background: row.type === "batch" ? "#fef9c3" : "#dbeafe",
                              color:      row.type === "batch" ? "#854d0e" : "#1e40af" }}>
                              {row.type}
                            </span>
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: pb.bg, color: pb.color }}>
                              {row.persona}
                            </span>
                          </td>
                          <td style={{ padding: "6px 8px", color: "var(--text-muted)" }}>{row.students}</td>
                          <td style={{ padding: "6px 8px", color: "var(--text-muted)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.topCluster}
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                              background: err ? "#fee2e2" : "#dcfce7",
                              color:      err ? "#991b1b" : "#166534" }}>
                              {err ? "error" : "ok"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </SkeletonPage>
  );
}

/* ─── module-level style objects (safe: referenced during render, after module init) ─── */
const ST         = { fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, marginTop: 0 };
const LB         = { display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" };
const microLabel = { fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 };
