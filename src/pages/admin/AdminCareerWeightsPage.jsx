// src/pages/admin/AdminCareerWeightsPage.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import AdminHeader from "../../components/AdminHeader";
import { apiGet, apiPost } from "../../apiClient";
import { useAdminContent } from "../../locales/AdminLanguageProvider";

const BASE = "/v1/admin-portal";

/* ─────────────────────────────────────────────────────────────────────────
   VALIDATION  (client-side; backend is source of truth)
   Rules: sum == 100, >= 5 keyskills, no weight > 50, no negatives
────────────────────────────────────────────────────────────────────────── */
function validateWeights(weights) {
  const errors = [];

  for (const w of weights) {
    const pct = parseFloat(w.weight_percentage);
    if (isNaN(pct) || pct < 0) {
      errors.push({ type: "negative", keyskill_id: w.keyskill_id, message: `"${w.keyskill_name}" weight cannot be negative` });
    } else if (pct > 50) {
      errors.push({ type: "max_weight", keyskill_id: w.keyskill_id, message: `"${w.keyskill_name}" weight cannot exceed 50%` });
    }
  }

  const sum = weights.reduce((s, w) => s + (parseFloat(w.weight_percentage) || 0), 0);
  if (weights.length < 5) {
    errors.push({ type: "min_keyskills", message: `At least 5 keyskills required (current: ${weights.length})` });
  }
  if (weights.length > 0 && Math.abs(sum - 100) > 0.01) {
    errors.push({ type: "sum", message: `Weights sum to ${sum.toFixed(1)}% — must equal exactly 100%` });
  }

  return errors;
}

/* ─────────────────────────────────────────────────────────────────────────
   STATUS BADGE
────────────────────────────────────────────────────────────────────────── */
const STATUS_META = {
  draft:          { label: "Draft",          bg: "#f1f5f9", color: "#475569" },
  pending_review: { label: "Pending Review", bg: "#fef3c7", color: "#92400e" },
  approved:       { label: "Approved",       bg: "#dcfce7", color: "#166534" },
  rejected:       { label: "Rejected",       bg: "#fee2e2", color: "#991b1b" },
  promoted:       { label: "Promoted",       bg: "#dbeafe", color: "#1e40af" },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? { label: status, bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 600,
      padding: "2px 8px", borderRadius: 4, background: m.bg, color: m.color,
    }}>
      {m.label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUM INDICATOR  — green when total == 100, red with delta otherwise
────────────────────────────────────────────────────────────────────────── */
function SumIndicator({ weights }) {
  const sum = weights.reduce((s, w) => s + (parseFloat(w.weight_percentage) || 0), 0);
  const ok  = Math.abs(sum - 100) <= 0.01;
  const delta = sum - 100;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 12px", borderRadius: 6,
      background: ok ? "#dcfce7" : "#fee2e2",
      border: `1px solid ${ok ? "#86efac" : "#fca5a5"}`,
      fontSize: 13, fontWeight: 700, color: ok ? "#166534" : "#dc2626",
    }}>
      <span>Total: {sum.toFixed(1)}%</span>
      {ok
        ? <span style={{ fontSize: 14 }}>✓</span>
        : <span style={{ fontWeight: 400, fontSize: 12 }}>
            ({delta > 0 ? "+" : ""}{delta.toFixed(1)}% — must equal 100%)
          </span>
      }
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE
────────────────────────────────────────────────────────────────────────── */
export default function AdminCareerWeightsPage() {
  const { careerId } = useParams();
  const { t } = useAdminContent();

  const [career,      setCareer]      = useState(null);
  const [weights,     setWeights]     = useState([]);   // working copy
  const [allKeyskills, setAllKeyskills] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  const [proposalTitle, setProposalTitle] = useState("");
  const [creating,  setCreating]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdReq, setCreatedReq] = useState(null); // { id, status }
  const [backendErrors, setBackendErrors] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");

  const [addSearch, setAddSearch] = useState("");
  const [addId,     setAddId]     = useState("");

  /* ─── load ─── */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [careerData, ksData] = await Promise.all([
        apiGet(`${BASE}/careers/${careerId}`),
        apiGet(`${BASE}/key-skills`).catch(() => ({ key_skills: [] })),
      ]);
      setCareer(careerData);
      const raw = careerData.keyskill_weights ?? careerData.key_skill_weights ?? [];
      setWeights(raw.map(w => ({
        keyskill_id:   w.keyskill_id,
        keyskill_name: w.keyskill_name ?? w.name ?? String(w.keyskill_id),
        weight_percentage: String(w.weight_percentage ?? w.weight ?? 0),
      })));
      const list = Array.isArray(ksData) ? ksData : (ksData.key_skills ?? ksData.keyskills ?? []);
      setAllKeyskills(list);
    } catch (e) {
      setError(e.message || t("admin.weights.loadError", "Failed to load career weights."));
    } finally {
      setLoading(false);
    }
  }, [careerId, t]);

  useEffect(() => { load(); }, [load]);

  /* ─── editing ─── */
  const updateWeight = (keyskill_id, value) => {
    setWeights(prev => prev.map(w =>
      w.keyskill_id === keyskill_id ? { ...w, weight_percentage: value } : w
    ));
    setBackendErrors([]);
    setSuccessMsg("");
  };

  const removeKeyskill = (keyskill_id) => {
    setWeights(prev => prev.filter(w => w.keyskill_id !== keyskill_id));
    setBackendErrors([]);
    setSuccessMsg("");
  };

  const addKeyskill = () => {
    if (!addId) return;
    const ks = allKeyskills.find(k => String(k.id ?? k.keyskill_id) === String(addId));
    if (!ks) return;
    if (weights.some(w => String(w.keyskill_id) === String(addId))) return;
    setWeights(prev => [...prev, {
      keyskill_id:   ks.id ?? ks.keyskill_id,
      keyskill_name: ks.name ?? ks.keyskill_name ?? String(addId),
      weight_percentage: "0",
    }]);
    setAddId("");
    setAddSearch("");
    setBackendErrors([]);
    setSuccessMsg("");
  };

  /* ─── validation ─── */
  const validationErrors = useMemo(() => validateWeights(weights), [weights]);
  const isValid = validationErrors.length === 0 && weights.length >= 5;

  /* ─── create proposal (draft) ─── */
  const handleCreate = async () => {
    if (!isValid) return;
    setCreating(true);
    setBackendErrors([]);
    setSuccessMsg("");
    try {
      const payload = {
        ...(proposalTitle ? { title: proposalTitle } : {}),
        proposed_weights: weights.map(w => ({
          keyskill_id:      w.keyskill_id,
          weight_percentage: parseFloat(w.weight_percentage),
        })),
      };
      const result = await apiPost(`${BASE}/careers/${careerId}/keyskill-weights/proposals`, payload);
      const reqId = result.id ?? result.request_id;
      setCreatedReq({ id: reqId, status: result.status ?? "draft" });
      setSuccessMsg(t("admin.weights.proposalCreated", "Draft proposal created (ID: {{id}})", { id: reqId }));
    } catch (e) {
      if (e.data?.errors) {
        setBackendErrors(e.data.errors);
      } else {
        setBackendErrors([{ message: e.message || "Failed to create proposal." }]);
      }
    } finally {
      setCreating(false);
    }
  };

  /* ─── submit draft → pending_review ─── */
  const handleSubmit = async () => {
    if (!createdReq) return;
    setSubmitting(true);
    setBackendErrors([]);
    try {
      const result = await apiPost(`${BASE}/weight-change-requests/${createdReq.id}/submit`);
      const newStatus = result.status ?? "pending_review";
      setCreatedReq(prev => ({ ...prev, status: newStatus }));
      setSuccessMsg(t("admin.weights.proposalSubmitted", "Submitted for review — status: {{status}}", { status: newStatus }));
    } catch (e) {
      if (e.data?.errors) {
        setBackendErrors(e.data.errors);
      } else {
        setBackendErrors([{ message: e.message || "Failed to submit." }]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── styles ─── */
  const inputCls = [
    "rounded-md border border-[var(--border)] bg-white px-3 py-2",
    "text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1",
  ].join(" ");

  const addableKeyskills = useMemo(() => {
    const existing = new Set(weights.map(w => String(w.keyskill_id)));
    return allKeyskills.filter(k => {
      const id = String(k.id ?? k.keyskill_id);
      if (existing.has(id)) return false;
      if (!addSearch) return true;
      const name = (k.name ?? k.keyskill_name ?? "").toLowerCase();
      return name.includes(addSearch.toLowerCase());
    });
  }, [weights, allKeyskills, addSearch]);

  const sum = weights.reduce((s, w) => s + (parseFloat(w.weight_percentage) || 0), 0);

  return (
    <>
      <AdminHeader
        title={career ? career.title : t("admin.weights.pageTitle", "Career Weight Editor")}
        crumbs={[
          { label: "Career Data" },
          { label: "Careers", to: "/admin/careers" },
        ]}
      />
      <SkeletonPage
        title={t("admin.weights.pageTitle", "Career Weight Editor")}
        subtitle={
          career
            ? `${career.career_code ? career.career_code + " — " : ""}${t("admin.weights.pageSubtitle", "Edit keyskill weights and create proposals")}`
            : ""
        }
        loading={loading}
        error={!loading ? error : ""}
        onRetry={load}
        footer={
          <Link to="/admin/careers" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>
            ← {t("admin.weights.backToCareers", "Back to Careers")}
          </Link>
        }
      >
        {/* ── Warning banner ── */}
        <div style={{
          padding: "12px 16px", borderRadius: 8, marginBottom: 20,
          background: "#fefce8", border: "1px solid #fde68a",
          fontSize: 13, color: "#854d0e",
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
          <span>
            {t("admin.weights.warning",
              "Proposals go through the approval workflow before taking effect. Create a draft, then submit it to put it in the review queue."
            )}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>

          {/* ══ LEFT: Weight editor ══ */}
          <div>
            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>
                {t("admin.weights.keyskillWeightsTitle", "Keyskill Weights")}
              </div>

              {/* Running total */}
              <div style={{ marginBottom: 14 }}>
                <SumIndicator weights={weights} />
              </div>

              {/* Weights table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)" }}>
                      {t("admin.weights.keyskillCol", "Keyskill")}
                    </th>
                    <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "var(--text-muted)", width: 130 }}>
                      {t("admin.weights.weightCol", "Weight (%)")}
                    </th>
                    <th style={{ padding: "8px 10px", width: 72 }} />
                  </tr>
                </thead>
                <tbody>
                  {weights.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: "20px 10px", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>
                        {t("admin.weights.noWeightsYet", "No keyskill weights configured yet. Add keyskills below.")}
                      </td>
                    </tr>
                  )}
                  {weights.map((w, idx) => {
                    const rowErr = validationErrors.find(e => e.keyskill_id === w.keyskill_id);
                    const beErr  = backendErrors.find(e => e.keyskill_id === w.keyskill_id);
                    const hasErr = rowErr || beErr;
                    const pct = parseFloat(w.weight_percentage) || 0;
                    return (
                      <tr key={w.keyskill_id} style={{
                        borderBottom: "1px solid var(--border)",
                        background: idx % 2 === 1 ? "var(--bg-app)" : "transparent",
                      }}>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ fontWeight: 500 }}>{w.keyskill_name}</div>
                          {/* Mini proportion bar */}
                          <div style={{ marginTop: 4, height: 4, borderRadius: 2, background: "#e2e8f0", position: "relative", overflow: "hidden" }}>
                            <div style={{
                              position: "absolute", left: 0, top: 0, bottom: 0,
                              width: `${Math.min(100, pct * 2)}%`,
                              borderRadius: 2,
                              background: hasErr ? "#dc2626" : "var(--brand-primary)",
                              transition: "width 0.2s",
                            }} />
                          </div>
                          {hasErr && (
                            <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3, fontWeight: 500 }}>
                              ⚠ {(rowErr || beErr).message}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            className={inputCls}
                            value={w.weight_percentage}
                            onChange={e => updateWeight(w.keyskill_id, e.target.value)}
                            style={{ width: 110, textAlign: "right" }}
                          />
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => removeKeyskill(w.keyskill_id)}
                          >
                            {t("admin.weights.removeKeyskill", "Remove")}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* ── Add keyskill ── */}
              <div style={{
                marginTop: 14, padding: "12px 14px",
                background: "var(--bg-app)", borderRadius: 8,
                border: "1px solid var(--border)",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {t("admin.weights.addKeyskill", "Add Keyskill")}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <input
                    className={inputCls}
                    value={addSearch}
                    onChange={e => { setAddSearch(e.target.value); setAddId(""); }}
                    placeholder={t("admin.weights.searchKeyskills", "Search keyskills…")}
                    style={{ flex: 1, minWidth: 160 }}
                  />
                  <select
                    className={inputCls}
                    value={addId}
                    onChange={e => setAddId(e.target.value)}
                    style={{ flex: 2, minWidth: 200 }}
                  >
                    <option value="">{t("admin.weights.selectKeyskill", "— select —")}</option>
                    {addableKeyskills.map(k => (
                      <option key={k.id ?? k.keyskill_id} value={k.id ?? k.keyskill_id}>
                        {k.name ?? k.keyskill_name}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" onClick={addKeyskill} disabled={!addId}>
                    {t("admin.weights.addButton", "Add")}
                  </Button>
                </div>
                {allKeyskills.length === 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                    Keyskill list unavailable — check /v1/admin-portal/key-skills endpoint.
                  </div>
                )}
              </div>

              {/* ── Global validation errors ── */}
              {validationErrors.filter(e => !e.keyskill_id).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {validationErrors.filter(e => !e.keyskill_id).map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#dc2626", fontWeight: 500, marginBottom: 4 }}>
                      ⚠ {e.message}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Proposal form ── */}
              <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {t("admin.weights.proposalSection", "Create Proposal")}
                </div>

                <input
                  className={inputCls}
                  value={proposalTitle}
                  onChange={e => setProposalTitle(e.target.value)}
                  placeholder={t("admin.weights.proposalTitlePlaceholder", "Proposal title (optional)")}
                  style={{ width: "100%", marginBottom: 12 }}
                />

                {/* Backend errors */}
                {backendErrors.filter(e => !e.keyskill_id).length > 0 && (
                  <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 6, background: "#fee2e2", border: "1px solid #fca5a5" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#991b1b", marginBottom: 4 }}>
                      {t("admin.weights.backendErrors", "Backend validation errors:")}
                    </div>
                    {backendErrors.filter(e => !e.keyskill_id).map((e, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#991b1b" }}>• {e.message}</div>
                    ))}
                  </div>
                )}

                {/* Success */}
                {successMsg && (
                  <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 6, background: "#dcfce7", border: "1px solid #86efac", fontSize: 12, color: "#166534", fontWeight: 600 }}>
                    ✓ {successMsg}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <Button onClick={handleCreate} disabled={!isValid || creating}>
                    {creating
                      ? t("admin.weights.creating", "Creating…")
                      : t("admin.weights.createProposal", "Create draft proposal")}
                  </Button>

                  {createdReq && createdReq.status === "draft" && (
                    <Button variant="secondary" onClick={handleSubmit} disabled={submitting}>
                      {submitting
                        ? t("admin.weights.submitting", "Submitting…")
                        : t("admin.weights.submitForReview", "Submit for review")}
                    </Button>
                  )}

                  {createdReq && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
                      <span>ID: {createdReq.id}</span>
                      <StatusBadge status={createdReq.status} />
                    </div>
                  )}
                </div>

                {createdReq && (
                  <div style={{ marginTop: 10 }}>
                    <Link to="/admin/weight-review" style={{ fontSize: 12, color: "var(--brand-primary)", textDecoration: "underline" }}>
                      {t("admin.weights.viewInQueue", "View in Review Queue →")}
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ══ RIGHT: Career info + weight breakdown ══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Career info */}
            {career && (
              <Card>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  {t("admin.weights.careerInfoTitle", "Career")}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{career.title}</div>
                {career.career_code && (
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)", marginBottom: career.cluster_name ? 6 : 0 }}>
                    {career.career_code}
                  </div>
                )}
                {career.cluster_name && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Cluster: {career.cluster_name}
                  </div>
                )}
              </Card>
            )}

            {/* Weight breakdown */}
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                {t("admin.weights.weightBreakdownTitle", "Weight Breakdown")}
              </div>

              {/* Stacked bar */}
              <div style={{ height: 24, borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)", display: "flex", marginBottom: 10 }}>
                {weights.length === 0 ? (
                  <div style={{ flex: 1, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("admin.weights.noWeightsYet", "No weights yet")}</span>
                  </div>
                ) : weights.map((w, i) => {
                  const pct = parseFloat(w.weight_percentage) || 0;
                  const barPct = sum > 0 ? (pct / sum) * 100 : 0;
                  const hue = (i * 43 + 210) % 360;
                  return (
                    <div
                      key={w.keyskill_id}
                      title={`${w.keyskill_name}: ${pct.toFixed(1)}%`}
                      style={{
                        width: `${barPct}%`,
                        background: `hsl(${hue}, 58%, 42%)`,
                        transition: "width 0.2s",
                        minWidth: barPct > 0 ? 2 : 0,
                      }}
                    />
                  );
                })}
              </div>

              <SumIndicator weights={weights} />

              <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
                {weights.length} {t("admin.weights.keyskillCount", "keyskills")}
                {weights.length < 5 && (
                  <span style={{ color: "#dc2626", marginLeft: 6 }}>
                    ({t("admin.weights.minRequired", "min 5 required")})
                  </span>
                )}
              </div>
            </Card>
          </div>

        </div>
      </SkeletonPage>
    </>
  );
}
