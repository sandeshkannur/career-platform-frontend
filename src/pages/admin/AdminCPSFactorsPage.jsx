// src/pages/admin/AdminCPSFactorsPage.jsx
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import { apiGet, apiPut } from "../../apiClient";

/* ─────────────────────────────────────────────────────────────────────────
   FACTOR VISUAL CONFIG — purely presentational, indexed by sort_order position
────────────────────────────────────────────────────────────────────────── */
const FACTOR_COLORS = [
  { color: "#1e40af", light: "#dbeafe", border: "#93c5fd" }, // dark blue   — factor 1
  { color: "#0f766e", light: "#ccfbf1", border: "#5eead4" }, // teal        — factor 2
  { color: "#166534", light: "#dcfce7", border: "#86efac" }, // green       — factor 3
  { color: "#92400e", light: "#fef3c7", border: "#fde68a" }, // amber       — factor 4
];

function factorUI(index) {
  return FACTOR_COLORS[index] ?? { color: "#475569", light: "#f8fafc", border: "#e2e8f0" };
}

/* ─────────────────────────────────────────────────────────────────────────
   VALIDATION
────────────────────────────────────────────────────────────────────────── */
function validate(factors) {
  const errors = {};

  factors.forEach(f => {
    const w = parseFloat(f.weight);
    if (isNaN(w) || w <= 0 || w > 1) {
      errors[f.factor_key] = "Weight must be > 0 and ≤ 1.";
    }
  });

  // Only check sum if all individual weights are individually valid
  const allIndividuallyValid = factors.every(f => !errors[f.factor_key]);
  if (allIndividuallyValid && factors.length > 0) {
    const sum = factors.reduce((s, f) => s + (parseFloat(f.weight) || 0), 0);
    if (Math.abs(sum - 1.0) > 0.01) {
      errors.__sum__ = `Weights sum to ${(sum * 100).toFixed(1)}% — must equal exactly 100%.`;
    }
  }

  return errors;
}

/* ─────────────────────────────────────────────────────────────────────────
   WEIGHT BAR — shows a single factor's weight as a proportion bar (0 → 1)
────────────────────────────────────────────────────────────────────────── */
function WeightBar({ weight, color }) {
  const pct = Math.max(0, Math.min(100, (parseFloat(weight) || 0) * 100));
  return (
    <div style={{
      height: 6, borderRadius: 3, background: "#e2e8f0",
      flex: 1, minWidth: 80, position: "relative",
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: `${pct}%`, borderRadius: 3, background: color,
        transition: "width 0.2s",
      }} />
      <div style={{
        position: "absolute", top: "50%", left: `${pct}%`,
        transform: "translate(-50%, -50%)",
        width: 10, height: 10, borderRadius: "50%",
        background: color, border: "2px solid #fff",
        boxShadow: "0 0 0 1px " + color,
        transition: "left 0.2s",
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   LIVE PREVIEW BAR — horizontal stacked bar proportional to weights
────────────────────────────────────────────────────────────────────────── */
function CpsPreviewBar({ factors }) {
  const total    = factors.reduce((s, f) => s + (parseFloat(f.weight) || 0), 0);
  const isValid  = factors.length > 0 && Math.abs(total - 1.0) <= 0.01;
  const totalPct = (total * 100).toFixed(1);

  return (
    <div>
      <div style={{
        fontSize: 12, fontWeight: 700, color: "var(--text-muted)",
        marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        Live Weight Preview
      </div>

      {/* Stacked bar */}
      <div style={{
        display: "flex", height: 36, borderRadius: 8,
        overflow: "hidden", border: "1px solid var(--border)",
      }}>
        {factors.map((f, i) => {
          const ui     = factorUI(i);
          const w      = parseFloat(f.weight) || 0;
          const pct    = total > 0 ? (w / total) * 100 : 0;
          const dispPct = (w * 100).toFixed(0);
          return (
            <div
              key={f.factor_key}
              title={`${f.label || f.factor_key}: ${dispPct}%`}
              style={{
                width: `${pct}%`,
                background: ui.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: "#fff",
                overflow: "hidden", whiteSpace: "nowrap",
                transition: "width 0.2s",
                minWidth: pct > 0 ? 2 : 0,
              }}
            >
              {pct >= 10 ? `${f.label || f.factor_key} ${dispPct}%` : ""}
            </div>
          );
        })}
        {/* Empty bar fallback */}
        {total === 0 && (
          <div style={{ flex: 1, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Enter weights above</span>
          </div>
        )}
      </div>

      {/* Total indicator */}
      <div style={{
        marginTop: 8, fontSize: 12, fontWeight: 600,
        color: isValid ? "#166534" : "#dc2626",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span>Total: {totalPct}%</span>
        {isValid
          ? <span style={{ fontSize: 14 }}>✓</span>
          : <span style={{ fontSize: 11, fontWeight: 400 }}>— must equal 100%</span>
        }
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
        {factors.map((f, i) => {
          const ui  = factorUI(i);
          const pct = ((parseFloat(f.weight) || 0) * 100).toFixed(1);
          return (
            <div key={f.factor_key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: ui.color, flexShrink: 0 }} />
              <span style={{ color: "var(--text-muted)" }}>
                {f.label || f.factor_key} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE
────────────────────────────────────────────────────────────────────────── */
export default function AdminCPSFactorsPage() {
  const [factors,  setFactors]  = useState([]);  // working copy
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState("");
  const [saveErr,  setSaveErr]  = useState("");

  /* ─── load ─── */
  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet("/v1/admin/cps-factors");
      const list = Array.isArray(data) ? data : (data?.factors ?? []);
      // Sort by sort_order so colours align consistently
      setFactors([...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
    } catch (e) {
      setError(e.message || "Failed to load CPS factors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  /* ─── local edits ─── */
  const updateFactor = (key, field, value) => {
    setFactors(prev => prev.map(f => f.factor_key === key ? { ...f, [field]: value } : f));
    setSaveMsg("");
    setSaveErr("");
  };

  /* ─── validation ─── */
  const validationErrors = useMemo(() => validate(factors), [factors]);
  const isValid = Object.keys(validationErrors).length === 0 && factors.length > 0;

  /* ─── save ─── */
  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    setSaveErr("");
    setSaveMsg("");
    try {
      const payload = factors.map(f => ({
        factor_key: f.factor_key,
        label:      f.label,
        weight:     parseFloat(f.weight),
      }));
      await apiPut("/v1/admin/cps-factors", payload);
      setSaveMsg("CPS factor weights saved successfully.");
    } catch (e) {
      setSaveErr(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ─── derived formula string (live) ─── */
  const formulaTerms = factors.map(f =>
    `(${f.label || f.factor_key} × ${(parseFloat(f.weight) || 0).toFixed(2)})`
  ).join(" + ");

  /* ─── input style ─── */
  const inputCls = [
    "rounded-md border border-[var(--border)] bg-white px-3 py-2",
    "text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1",
  ].join(" ");

  /* ─── render ─── */
  return (
    <SkeletonPage
      title="CPS Factor Weights"
      subtitle="Configure the weights for each Context Profile Score factor"
      loading={loading}
      error={!loading ? error : ""}
      onRetry={loadAll}
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
      {/* ── Safety warning ── */}
      <div style={{
        padding: "12px 16px", borderRadius: 8, marginBottom: 20,
        background: "#fefce8", border: "1px solid #fde68a",
        fontSize: 13, color: "#854d0e",
        display: "flex", gap: 10, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
        <span>
          Changing CPS factor weights affects how student context adjusts career recommendations.
          Changes take effect immediately for new assessments.
          Weights must sum to exactly <strong>1.0 (100%)</strong>.
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* ══ LEFT: Factor editor ══ */}
        <div>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
              Factor Configuration
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {factors.map((factor, idx) => {
                const ui  = factorUI(idx);
                const err = validationErrors[factor.factor_key];

                return (
                  <div
                    key={factor.factor_key}
                    style={{
                      background: ui.light,
                      borderRadius: "0 8px 8px 0",
                      padding: "12px 14px",
                      border: `1px solid ${ui.border}`,
                      borderLeft: `4px solid ${ui.color}`,
                    }}
                  >
                    {/* Top row: key pill + label + weight */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

                      {/* factor_key — read-only badge */}
                      <span style={{
                        fontFamily: "monospace", fontSize: 11, fontWeight: 700,
                        color: ui.color, background: "#fff",
                        padding: "2px 8px", borderRadius: 4,
                        border: `1px solid ${ui.border}`,
                        whiteSpace: "nowrap", flexShrink: 0,
                      }}>
                        {factor.factor_key}
                      </span>

                      {/* Label */}
                      <div style={{ flex: 2, minWidth: 120 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 3 }}>
                          LABEL
                        </div>
                        <input
                          className={inputCls}
                          value={factor.label ?? ""}
                          onChange={e => updateFactor(factor.factor_key, "label", e.target.value)}
                          placeholder="e.g. Socio-Economic Status"
                          style={{ width: "100%" }}
                        />
                      </div>

                      {/* Weight */}
                      <div style={{ width: 100, flexShrink: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 3 }}>
                          WEIGHT (0–1)
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          className={inputCls}
                          value={factor.weight ?? ""}
                          onChange={e => updateFactor(factor.factor_key, "weight", e.target.value)}
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>

                    {/* Weight proportion bar */}
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>0%</span>
                      <WeightBar weight={factor.weight} color={ui.color} />
                      <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {((parseFloat(factor.weight) || 0) * 100).toFixed(1)}%
                      </span>
                    </div>

                    {/* Per-factor validation error */}
                    {err && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#dc2626", fontWeight: 500 }}>
                        ⚠ {err}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Save controls ── */}
            <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              {validationErrors.__sum__ && (
                <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 10 }}>
                  ⚠ {validationErrors.__sum__}
                </p>
              )}
              {!isValid && !validationErrors.__sum__ && factors.length > 0 && (
                <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 10 }}>
                  Fix the validation errors above before saving.
                </p>
              )}
              {saveErr && (
                <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 10 }}>{saveErr}</p>
              )}
              {saveMsg && (
                <div style={{
                  padding: "8px 12px", borderRadius: 6, marginBottom: 10,
                  background: "#dcfce7", border: "1px solid #86efac",
                  fontSize: 12, color: "#166534", fontWeight: 600,
                }}>
                  ✓ {saveMsg}
                </div>
              )}
              <Button onClick={handleSave} disabled={!isValid || saving}>
                {saving ? "Saving…" : "Save Weights"}
              </Button>
            </div>
          </Card>
        </div>

        {/* ══ RIGHT: Preview + formula ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Live preview bar */}
          <Card>
            <CpsPreviewBar factors={factors} />
          </Card>

          {/* Formula explanation */}
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              CPS Formula
            </div>

            {/* Dynamic formula — updates live */}
            <div style={{
              fontFamily: "monospace", fontSize: 12,
              background: "#f8fafc", border: "1px solid var(--border)",
              borderRadius: 6, padding: "10px 14px",
              marginBottom: 12, lineHeight: 1.8,
              overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
              color: "var(--text-primary)",
            }}>
              CPS = {formulaTerms || "…"}
            </div>

            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
              <p style={{ margin: "0 0 8px" }}>
                The <strong>Context Profile Score</strong> adjusts career recommendations based
                on a student's background and circumstances. A higher weight means that factor
                has more influence on the adjustment.
              </p>
              <p style={{ margin: "0 0 8px" }}>
                Weights must sum to exactly <strong>1.0 (100%)</strong>. Each weight must be
                greater than 0 and at most 1.
              </p>
              <p style={{ margin: 0 }}>
                Factor keys are stable identifiers and cannot be changed — only labels and
                weights are editable here.
              </p>
            </div>
          </Card>
        </div>

      </div>
    </SkeletonPage>
  );
}
