// src/pages/admin/AdminFitBandsPage.jsx
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import { apiGet, apiPut } from "../../apiClient";

/* ─────────────────────────────────────────────────────────────────────────
   BAND VISUAL CONFIG
   These are purely presentational — colours and sort hints.
   The canonical data (label, min_score) always comes from the API.
────────────────────────────────────────────────────────────────────────── */
const BAND_UI = {
  high_potential: { color: "#15803d", light: "#dcfce7", border: "#86efac", rank: 1 },
  strong:         { color: "#16a34a", light: "#d1fae5", border: "#6ee7b7", rank: 2 },
  promising:      { color: "#2563eb", light: "#dbeafe", border: "#93c5fd", rank: 3 },
  developing:     { color: "#d97706", light: "#fef9c3", border: "#fde68a", rank: 4 },
  exploring:      { color: "#64748b", light: "#f1f5f9", border: "#cbd5e1", rank: 5 },
};

function bandUI(key) {
  return BAND_UI[key] ?? { color: "#475569", light: "#f8fafc", border: "#e2e8f0", rank: 99 };
}

/* ─────────────────────────────────────────────────────────────────────────
   VALIDATION
────────────────────────────────────────────────────────────────────────── */
function validate(bands) {
  const errors = {};

  bands.forEach((b, i) => {
    const score = parseFloat(b.min_score);
    if (isNaN(score) || score < 0 || score > 100) {
      errors[b.band_key] = "Score must be 0–100.";
    }
  });

  // Band 5 (last by sort_order) must always be 0
  const last = bands[bands.length - 1];
  if (last && parseFloat(last.min_score) !== 0) {
    errors[last.band_key] = `${last.band_key} must always be 0 (lowest band).`;
  }

  // Scores must be strictly descending (first band highest)
  for (let i = 0; i < bands.length - 1; i++) {
    const curr = parseFloat(bands[i].min_score);
    const next = parseFloat(bands[i + 1].min_score);
    if (!isNaN(curr) && !isNaN(next) && curr <= next) {
      errors[bands[i].band_key] =
        errors[bands[i].band_key] ||
        `Min score must be higher than "${bands[i + 1].band_key}" (${next}).`;
    }
  }

  return errors; // {} = valid
}

/* ─────────────────────────────────────────────────────────────────────────
   THRESHOLD BAR — shows a single band's position on 0–100
────────────────────────────────────────────────────────────────────────── */
function ThresholdBar({ minScore, color }) {
  const pct = Math.max(0, Math.min(100, parseFloat(minScore) || 0));
  return (
    <div style={{
      height: 6, borderRadius: 3, background: "#e2e8f0",
      position: "relative", flex: 1, minWidth: 80,
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
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   VISUAL PREVIEW — horizontal segmented bar, live-updates
────────────────────────────────────────────────────────────────────────── */
function PreviewBar({ bands }) {
  // segments: from each band's min_score to the previous band's min_score (or 100)
  const segments = bands.map((b, i) => {
    const from = parseFloat(b.min_score) || 0;
    const to   = i === 0 ? 100 : (parseFloat(bands[i - 1].min_score) || 100);
    const width = Math.max(0, to - from);
    return { ...b, from, to, width };
  });

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Live Threshold Preview
      </div>
      {/* The bar */}
      <div style={{ display: "flex", height: 32, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
        {segments.map(seg => {
          const ui = bandUI(seg.band_key);
          return (
            <div
              key={seg.band_key}
              title={`${seg.label}: ${seg.from}–${seg.to}`}
              style={{
                width: `${seg.width}%`,
                background: ui.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: "#fff",
                overflow: "hidden", whiteSpace: "nowrap",
                transition: "width 0.2s",
                minWidth: seg.width > 0 ? 2 : 0,
              }}
            >
              {seg.width >= 8 ? seg.label : ""}
            </div>
          );
        })}
      </div>
      {/* Tick labels */}
      <div style={{ display: "flex", marginTop: 4 }}>
        {segments.map(seg => (
          <div key={seg.band_key} style={{ width: `${seg.width}%`, textAlign: "center", fontSize: 10, color: "var(--text-muted)", overflow: "hidden" }}>
            {seg.width >= 8 ? `≥${seg.from}` : ""}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
        {segments.map(seg => {
          const ui = bandUI(seg.band_key);
          return (
            <div key={seg.band_key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: ui.color, flexShrink: 0 }} />
              <span style={{ color: "var(--text-muted)" }}>{seg.label} ({seg.from}–{seg.to})</span>
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
export default function AdminFitBandsPage() {
  const [bands,    setBands]    = useState([]);   // working copy
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState("");   // success message
  const [saveErr,  setSaveErr]  = useState("");

  /* ─── load ─── */

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet("/v1/admin/fit-bands");
      const list = Array.isArray(data) ? data : (data?.bands ?? []);
      // Sort by sort_order ascending (band 1 = highest score first)
      setBands([...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
    } catch (e) {
      setError(e.message || "Failed to load fit bands.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  /* ─── local edits ─── */

  const updateBand = (key, field, value) => {
    setBands(prev => prev.map(b => b.band_key === key ? { ...b, [field]: value } : b));
    setSaveMsg("");
    setSaveErr("");
  };

  /* ─── validation ─── */

  const validationErrors = useMemo(() => validate(bands), [bands]);
  const isValid = Object.keys(validationErrors).length === 0;
  const lastBandKey = bands[bands.length - 1]?.band_key;

  /* ─── save ─── */

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    setSaveErr("");
    setSaveMsg("");
    try {
      const payload = bands.map(b => ({
        band_key:  b.band_key,
        label:     b.label,
        min_score: parseFloat(b.min_score),
      }));
      await apiPut("/v1/admin/fit-bands", payload);
      setSaveMsg("Thresholds saved successfully.");
    } catch (e) {
      setSaveErr(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ─── input style ─── */

  const inputCls = [
    "rounded-md border border-[var(--border)] bg-white px-3 py-2",
    "text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1",
  ].join(" ");

  /* ─── render ─── */

  return (
    <SkeletonPage
      title="Fit Band Thresholds"
      subtitle="Configure score thresholds and labels for career fit bands"
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
          Changing these thresholds affects how all student career recommendations are labelled.
          Changes take effect immediately for new assessments.
          Band scores must be <strong>strictly descending</strong> and the lowest band must always be 0.
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* ── LEFT: Band editor ── */}
        <div>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
              Band Configuration
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {bands.map((band) => {
                const ui  = bandUI(band.band_key);
                const err = validationErrors[band.band_key];
                const isLastBand = band.band_key === lastBandKey;

                return (
                  <div key={band.band_key} style={{
                    borderLeft: `4px solid ${ui.color}`,
                    background: ui.light,
                    borderRadius: "0 8px 8px 0",
                    padding: "12px 14px",
                    border: `1px solid ${ui.border}`,
                    borderLeft: `4px solid ${ui.color}`,
                  }}>
                    {/* Top row: key + inputs */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {/* Band key pill */}
                      <span style={{
                        fontFamily: "monospace", fontSize: 11, fontWeight: 700,
                        color: ui.color, background: "#fff",
                        padding: "2px 8px", borderRadius: 4,
                        border: `1px solid ${ui.border}`,
                        whiteSpace: "nowrap", flexShrink: 0,
                      }}>
                        {band.band_key}
                      </span>

                      {/* Label */}
                      <div style={{ flex: 2, minWidth: 120 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 3 }}>LABEL</div>
                        <input
                          className={inputCls}
                          value={band.label ?? ""}
                          onChange={e => updateBand(band.band_key, "label", e.target.value)}
                          placeholder="e.g. High Potential"
                          style={{ width: "100%" }}
                        />
                      </div>

                      {/* Min Score */}
                      <div style={{ width: 90, flexShrink: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 3 }}>
                          MIN SCORE
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className={inputCls}
                          value={band.min_score ?? ""}
                          onChange={e => updateBand(band.band_key, "min_score", e.target.value)}
                          disabled={isLastBand}
                          style={{ width: "100%", background: isLastBand ? "#f1f5f9" : undefined }}
                        />
                        {isLastBand && (
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>always 0</div>
                        )}
                      </div>
                    </div>

                    {/* Threshold bar */}
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>0</span>
                      <ThresholdBar minScore={band.min_score} color={ui.color} />
                      <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>100</span>
                    </div>

                    {/* Validation error */}
                    {err && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#dc2626", fontWeight: 500 }}>
                        ⚠ {err}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save controls */}
            <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              {!isValid && (
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
              <Button
                onClick={handleSave}
                disabled={!isValid || saving}
              >
                {saving ? "Saving…" : "Save Thresholds"}
              </Button>
            </div>
          </Card>
        </div>

        {/* ── RIGHT: Preview + info ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Live preview */}
          <Card>
            <PreviewBar bands={bands} />
          </Card>

          {/* Reference info */}
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
              How bands work
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
              <p style={{ margin: "0 0 8px" }}>
                A student's career fit score (0–100) is bucketed into a band by finding the <strong>highest</strong> band whose <code>min_score</code> the student meets or exceeds.
              </p>
              <p style={{ margin: "0 0 8px" }}>
                <strong>Example</strong> with defaults (80/65/45/25/0):
              </p>
              <ul style={{ margin: "0 0 8px", paddingLeft: 16 }}>
                <li>Score 85 → High Potential (≥80)</li>
                <li>Score 70 → Strong (≥65)</li>
                <li>Score 50 → Promising (≥45)</li>
                <li>Score 30 → Developing (≥25)</li>
                <li>Score 10 → Exploring (≥0)</li>
              </ul>
              <p style={{ margin: 0 }}>
                Band keys are stable and must not change — only labels and thresholds are editable here.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </SkeletonPage>
  );
}
