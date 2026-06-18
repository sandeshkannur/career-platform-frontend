// src/pages/admin/AdminWeightReviewPage.jsx
import { useState, useEffect, useCallback, Fragment } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import AdminHeader from "../../components/AdminHeader";
import AdminModal from "../../components/AdminModal";
import { apiGet, apiPost } from "../../apiClient";
import { useAdminContent } from "../../locales/AdminLanguageProvider";

const BASE = "/v1/admin-portal";

/* ─────────────────────────────────────────────────────────────────────────
   STATUS META
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
      whiteSpace: "nowrap",
    }}>
      {m.label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   DIFF TABLE  — baseline vs proposed weights with change highlighting
────────────────────────────────────────────────────────────────────────── */
function DiffTable({ baselineWeights = [], proposedWeights = [], ksMap = {} }) {
  const baseMap = Object.fromEntries(baselineWeights.map(w => [w.keyskill_id, w]));
  const propMap = Object.fromEntries(proposedWeights.map(w => [w.keyskill_id, w]));

  const allIds = [...new Set([
    ...baselineWeights.map(w => w.keyskill_id),
    ...proposedWeights.map(w => w.keyskill_id),
  ])];

  const rows = allIds.map(id => {
    const b = baseMap[id];
    const p = propMap[id];
    const before = b ? parseFloat(b.weight_percentage) : null;
    const after  = p ? parseFloat(p.weight_percentage) : null;
    return {
      id,
      name:    ksMap[id] ?? (b || p).keyskill_name ?? String(id),
      before,
      after,
      added:   !b && !!p,
      removed: !!b && !p,
      changed: b && p && Math.abs(before - after) > 0.01,
    };
  });

  const baselineSum = baselineWeights.reduce((s, w) => s + (parseFloat(w.weight_percentage) || 0), 0);
  const proposedSum = proposedWeights.reduce((s, w) => s + (parseFloat(w.weight_percentage) || 0), 0);
  const baseSumOk = Math.abs(baselineSum - 100) <= 0.01;
  const propSumOk = Math.abs(proposedSum - 100) <= 0.01;

  const thStyle = {
    padding: "6px 10px", textAlign: "left",
    fontWeight: 700, color: "var(--text-muted)",
    borderBottom: "2px solid var(--border)", whiteSpace: "nowrap",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={thStyle}>Keyskill</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Before (%)</th>
            <th style={{ ...thStyle, textAlign: "right" }}>After (%)</th>
            <th style={thStyle}>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} style={{
              borderBottom: "1px solid var(--border)",
              background: row.added
                ? "#dcfce7"
                : row.removed
                  ? "#fee2e2"
                  : row.changed
                    ? "#fef3c7"
                    : "transparent",
            }}>
              <td style={{ padding: "5px 10px", fontWeight: row.changed || row.added || row.removed ? 600 : 400 }}>
                {row.name}
              </td>
              <td style={{ padding: "5px 10px", textAlign: "right", fontFamily: "monospace", color: "var(--text-muted)" }}>
                {row.before != null ? `${row.before.toFixed(1)}` : "—"}
              </td>
              <td style={{ padding: "5px 10px", textAlign: "right", fontFamily: "monospace" }}>
                {row.after != null ? `${row.after.toFixed(1)}` : "—"}
              </td>
              <td style={{ padding: "5px 10px" }}>
                {row.added && <span style={{ color: "#166534", fontWeight: 600 }}>+ added</span>}
                {row.removed && <span style={{ color: "#991b1b", fontWeight: 600 }}>− removed</span>}
                {row.changed && !row.added && !row.removed && (
                  <span style={{ color: "#92400e", fontWeight: 600 }}>
                    {row.after > row.before ? "↑" : "↓"} {Math.abs(row.after - row.before).toFixed(1)}%
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid var(--border)", fontWeight: 700, background: "#f8fafc" }}>
            <td style={{ padding: "6px 10px" }}>Sum</td>
            <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "monospace", color: baseSumOk ? "#166534" : "#dc2626" }}>
              {baselineSum.toFixed(1)}%
            </td>
            <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "monospace", color: propSumOk ? "#166534" : "#dc2626" }}>
              {proposedSum.toFixed(1)}%
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   FORMAT DATE
────────────────────────────────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE
────────────────────────────────────────────────────────────────────────── */
export default function AdminWeightReviewPage() {
  const { t } = useAdminContent();

  const [tab,           setTab]           = useState("queue");
  const [requests,      setRequests]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [statusFilter,  setStatusFilter]  = useState("");

  // Row expansion
  const [expandedId,    setExpandedId]    = useState(null);
  const [detailCache,   setDetailCache]   = useState({});
  const [loadingDetail, setLoadingDetail] = useState(null);

  // Per-request action state
  const [actionLoading, setActionLoading] = useState({});
  const [actionError,   setActionError]   = useState({});
  const [actionResult,  setActionResult]  = useState({});

  // Comment boxes: { [id]: { type: "approve"|"reject", comment: "" } | null }
  const [commentBox,    setCommentBox]    = useState({});

  // Promote confirm modal
  const [promoteId,     setPromoteId]     = useState(null);

  // Lookup maps built once on mount — no per-row fetches
  const [ksMap,     setKsMap]     = useState({});  // { [keyskill_id]: name }
  const [careerMap, setCareerMap] = useState({});  // { [career_id]: title }

  useEffect(() => {
    Promise.all([
      apiGet(`${BASE}/key-skills`).catch(() => null),
      apiGet("/v1/careers").catch(() => null),
    ]).then(([ksData, careersData]) => {
      if (ksData) {
        const list = Array.isArray(ksData) ? ksData : (ksData.key_skills ?? ksData.keyskills ?? []);
        setKsMap(Object.fromEntries(list.map(k => [k.id ?? k.keyskill_id, k.name ?? k.keyskill_name ?? String(k.id ?? k.keyskill_id)])));
      }
      if (careersData) {
        const list = Array.isArray(careersData) ? careersData : (careersData.careers ?? []);
        setCareerMap(Object.fromEntries(list.map(c => [c.id, c.title])));
      }
    });
  }, []);

  /* ─── load queue ─── */
  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : "";
      const data = await apiGet(`${BASE}/weight-change-requests${qs}`);
      setRequests(Array.isArray(data) ? data : (data.items ?? data.requests ?? []));
    } catch (e) {
      setError(e.message || t("admin.weightReview.error.loadFailed", "Failed to load weight change requests."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  /* ─── toggle row expansion & load detail ─── */
  const toggleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    if (detailCache[id]) { setExpandedId(id); return; }
    setLoadingDetail(id);
    setExpandedId(id);
    try {
      const data = await apiGet(`${BASE}/weight-change-requests/${id}`);
      setDetailCache(prev => ({ ...prev, [id]: data }));
    } catch (e) {
      setActionError(prev => ({ ...prev, [id]: e.message || "Failed to load detail." }));
    } finally {
      setLoadingDetail(null);
    }
  };

  /* ─── refresh one row ─── */
  const refreshRequest = async (id) => {
    try {
      const data = await apiGet(`${BASE}/weight-change-requests/${id}`);
      setDetailCache(prev => ({ ...prev, [id]: data }));
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: data.status } : r));
    } catch { /* ignore */ }
  };

  /* ─── actions ─── */
  const setLoading1 = (id, v) => setActionLoading(prev => ({ ...prev, [id]: v }));
  const setError1   = (id, v) => setActionError(prev => ({ ...prev, [id]: v }));
  const setResult1  = (id, v) => setActionResult(prev => ({ ...prev, [id]: v }));

  const doSubmit = async (id) => {
    setLoading1(id, true); setError1(id, "");
    try {
      await apiPost(`${BASE}/weight-change-requests/${id}/submit`);
      await refreshRequest(id);
    } catch (e) {
      setError1(id, e.message || t("admin.weightReview.error.actionFailed", "Action failed."));
    } finally {
      setLoading1(id, false);
    }
  };

  const doApprove = async (id, comment) => {
    setLoading1(id, true); setError1(id, "");
    try {
      await apiPost(`${BASE}/weight-change-requests/${id}/approve`, comment ? { decision_comment: comment } : {});
      setCommentBox(prev => ({ ...prev, [id]: null }));
      await refreshRequest(id);
    } catch (e) {
      setError1(id, e.message || t("admin.weightReview.error.actionFailed", "Action failed."));
    } finally {
      setLoading1(id, false);
    }
  };

  const doReject = async (id, comment) => {
    setLoading1(id, true); setError1(id, "");
    try {
      await apiPost(`${BASE}/weight-change-requests/${id}/reject`, comment ? { decision_comment: comment } : {});
      setCommentBox(prev => ({ ...prev, [id]: null }));
      await refreshRequest(id);
    } catch (e) {
      setError1(id, e.message || t("admin.weightReview.error.actionFailed", "Action failed."));
    } finally {
      setLoading1(id, false);
    }
  };

  const doPromote = async (id) => {
    setPromoteId(null);
    setLoading1(id, true); setError1(id, ""); setResult1(id, null);
    try {
      const result = await apiPost(`${BASE}/weight-change-requests/${id}/promote`);
      setResult1(id, result);
      await refreshRequest(id);
    } catch (e) {
      setError1(id, e.message || t("admin.weightReview.error.actionFailed", "Action failed."));
    } finally {
      setLoading1(id, false);
    }
  };

  /* ─── styles ─── */
  const inputCls = [
    "rounded-md border border-[var(--border)] bg-white px-3 py-2",
    "text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1",
  ].join(" ");

  const tabStyle = (active) => ({
    padding: "8px 20px", fontSize: 14, fontWeight: active ? 700 : 500,
    border: "none", background: "transparent", cursor: "pointer",
    color: active ? "var(--brand-primary)" : "var(--text-muted)",
    borderBottom: active ? "2px solid var(--brand-primary)" : "2px solid transparent",
    marginBottom: -2, transition: "all 0.15s", fontFamily: "inherit",
  });

  const STATUS_FILTER_OPTIONS = [
    { value: "",               label: t("admin.weightReview.filter.all",          "All") },
    { value: "draft",          label: t("admin.weightReview.filter.draft",         "Draft") },
    { value: "pending_review", label: t("admin.weightReview.filter.pendingReview", "Pending Review") },
    { value: "approved",       label: t("admin.weightReview.filter.approved",      "Approved") },
    { value: "rejected",       label: t("admin.weightReview.filter.rejected",      "Rejected") },
    { value: "promoted",       label: t("admin.weightReview.filter.promoted",      "Promoted") },
  ];

  /* ─── table rows (shared by both tabs) ─── */
  const renderTableRows = (rows, showActions) => (
    <tbody>
      {rows.length === 0 && (
        <tr>
          <td colSpan={showActions ? 7 : 8} style={{ padding: "24px 10px", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>
            {t("admin.weightReview.empty", "No weight change requests found.")}
          </td>
        </tr>
      )}
      {rows.map((req, idx) => {
        const isExpanded = expandedId === req.id;
        const detail     = detailCache[req.id];
        const loadingDet = loadingDetail === req.id;
        const aLoading   = actionLoading[req.id];
        const aError     = actionError[req.id];
        const aResult    = actionResult[req.id];
        const cBox       = commentBox[req.id];

        return (
          <Fragment key={req.id}>
            {/* Main row */}
            <tr
              style={{
                borderBottom: isExpanded ? "none" : "1px solid var(--border)",
                background: isExpanded ? "#dbeafe" : idx % 2 === 1 ? "var(--bg-app)" : "transparent",
                cursor: "pointer",
              }}
              onClick={() => toggleExpand(req.id)}
            >
              <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 12 }}>
                #{req.id}
              </td>
              <td style={{ padding: "8px 10px", maxWidth: 200 }}>
                <div style={{ fontWeight: 500, color: "#0d9488" }}>
                  {req.title || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Untitled</span>}
                  {isExpanded ? " ▲" : " ▼"}
                </div>
              </td>
              <td style={{ padding: "8px 10px" }}>
                <StatusBadge status={req.status} />
              </td>
              <td style={{ padding: "8px 10px", fontSize: 12 }}>
                {/* career_id is inside changes[0]; for multi-career batches shows first */}
                {careerMap[req.changes?.[0]?.career_id] ?? req.changes?.[0]?.career_id ?? "—"}
              </td>
              <td style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-muted)" }}>
                {req.created_by ?? "—"}
              </td>
              <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {fmtDate(req.created_at)}
              </td>
              {/* Audit-trail extra columns */}
              {!showActions && (
                <>
                  <td style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-muted)" }}>
                    {req.reviewed_by ?? "—"}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center" }}>
                    {req.status === "promoted"
                      ? (detail?.vectors_recomputed ?? req.vectors_recomputed)
                        ? <span style={{ color: "#166534", fontSize: 11, fontWeight: 600 }}>✓ Recomputed</span>
                        : <span style={{ color: "#92400e", fontSize: 11, fontWeight: 600 }}>⚠ Stale</span>
                      : <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
                    }
                  </td>
                </>
              )}
            </tr>

            {/* Inline detail panel */}
            {isExpanded && (
              <tr>
                <td colSpan={showActions ? 7 : 8} style={{ padding: 0, borderBottom: "2px solid var(--border)" }}>
                  <div style={{ background: "#f0f7ff", borderTop: "2px solid #bfdbfe", padding: "16px 20px" }}>

                    {loadingDet && (
                      <div style={{ color: "var(--text-muted)", fontSize: 13, fontStyle: "italic" }}>Loading detail…</div>
                    )}

                    {aError && (
                      <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 6, background: "#fee2e2", border: "1px solid #fca5a5", fontSize: 12, color: "#991b1b" }}>
                        ⚠ {aError}
                      </div>
                    )}

                    {/* Promote result */}
                    {aResult && (
                      <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 8, background: "#dcfce7", border: "1px solid #86efac" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#166534", marginBottom: 6 }}>
                          ✓ Promoted successfully
                        </div>
                        <div style={{ fontSize: 12, color: "#166534" }}>
                          Careers promoted: {aResult.careers_promoted ?? "—"}
                        </div>
                        {aResult.vectors_recomputed
                          ? <div style={{ fontSize: 12, color: "#166534" }}>Vectors recomputed: {typeof aResult.vectors_recomputed === "number" ? aResult.vectors_recomputed : "✓"}</div>
                          : <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginTop: 4 }}>
                              ⚠ Vectors stale — recompute pending
                              {aResult.recompute_note && <div style={{ fontWeight: 400, marginTop: 2 }}>{aResult.recompute_note}</div>}
                            </div>
                        }
                        {aResult.sme_warnings?.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>SME warnings:</div>
                            {aResult.sme_warnings.map((w, i) => (
                              <div key={i} style={{ fontSize: 12, color: "#92400e" }}>• {w}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {detail && (
                      <>
                        {/* Diff header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                              {detail.title || "Untitled proposal"}
                            </span>
                            {detail.career_title && (
                              <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 10 }}>
                                Career: {detail.career_title}
                              </span>
                            )}
                          </div>
                          {detail.decision_comment && (
                            <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", maxWidth: 300 }}>
                              "{detail.decision_comment}"
                            </div>
                          )}
                        </div>

                        {/* Before → After diff */}
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Keyskill Weight Changes
                          </div>
                          <DiffTable
                            baselineWeights={detail.changes?.[0]?.baseline_weights ?? detail.baseline_weights ?? []}
                            proposedWeights={detail.changes?.[0]?.proposed_weights ?? detail.proposed_weights ?? []}
                            ksMap={ksMap}
                          />
                        </div>

                        {/* Comment box */}
                        {cBox && showActions && (
                          <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 8, background: "#fff", border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                              {cBox.type === "approve" ? "Approve with comment" : "Reject with comment"}
                            </div>
                            <textarea
                              className={inputCls}
                              rows={2}
                              style={{ width: "100%", resize: "vertical", marginBottom: 8 }}
                              placeholder={t("admin.weightReview.comment.placeholder", "Optional comment…")}
                              value={cBox.comment}
                              onChange={e => setCommentBox(prev => ({ ...prev, [req.id]: { ...prev[req.id], comment: e.target.value } }))}
                            />
                            <div style={{ display: "flex", gap: 8 }}>
                              <Button
                                size="sm"
                                variant={cBox.type === "reject" ? "danger" : "primary"}
                                disabled={aLoading}
                                onClick={() =>
                                  cBox.type === "approve"
                                    ? doApprove(req.id, cBox.comment)
                                    : doReject(req.id, cBox.comment)
                                }
                              >
                                {aLoading
                                  ? (cBox.type === "approve"
                                    ? t("admin.weightReview.action.approving", "Approving…")
                                    : t("admin.weightReview.action.rejecting", "Rejecting…"))
                                  : (cBox.type === "approve"
                                    ? t("admin.weightReview.action.approve", "Approve")
                                    : t("admin.weightReview.action.reject", "Reject"))
                                }
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setCommentBox(prev => ({ ...prev, [req.id]: null }))}
                              >
                                {t("admin.weightReview.comment.cancel", "Cancel")}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Action buttons (queue tab only) */}
                        {showActions && !cBox && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {req.status === "draft" && (
                              <Button
                                size="sm"
                                disabled={aLoading}
                                onClick={() => doSubmit(req.id)}
                              >
                                {aLoading
                                  ? t("admin.weightReview.action.submitting", "Submitting…")
                                  : t("admin.weightReview.action.submit", "Submit for Review")}
                              </Button>
                            )}

                            {req.status === "pending_review" && (
                              <>
                                <Button
                                  size="sm"
                                  disabled={aLoading}
                                  onClick={() => setCommentBox(prev => ({ ...prev, [req.id]: { type: "approve", comment: "" } }))}
                                >
                                  {t("admin.weightReview.action.approve", "Approve")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={aLoading}
                                  onClick={() => setCommentBox(prev => ({ ...prev, [req.id]: { type: "reject", comment: "" } }))}
                                >
                                  {t("admin.weightReview.action.reject", "Reject")}
                                </Button>
                              </>
                            )}

                            {req.status === "approved" && (
                              <Button
                                size="sm"
                                disabled={aLoading}
                                onClick={() => setPromoteId(req.id)}
                              >
                                {aLoading
                                  ? t("admin.weightReview.action.promoting", "Promoting…")
                                  : t("admin.weightReview.action.promote", "Promote to Live")}
                              </Button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </Fragment>
        );
      })}
    </tbody>
  );

  /* ─── filtered rows ─── */
  const queueRows = requests.filter(r =>
    !statusFilter || r.status === statusFilter
  );

  /* ─── render ─── */
  return (
    <>
      <AdminHeader
        title={t("admin.weightReview.pageTitle", "Weight Change Requests")}
        crumbs={[{ label: "Scoring Engine" }]}
      />

      <SkeletonPage
        title={t("admin.weightReview.pageTitle", "Weight Change Requests")}
        subtitle={t("admin.weightReview.pageSubtitle", "Review and approve keyskill weight proposals")}
        loading={loading}
        error={!loading ? error : ""}
        onRetry={loadRequests}
        actions={
          <Button size="sm" variant="secondary" onClick={loadRequests}>
            Refresh
          </Button>
        }
        footer={
          <Link to="/admin" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>
            ← Admin Console
          </Link>
        }
      >
        {/* ── Tab bar ── */}
        <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: 20 }}>
          <button style={tabStyle(tab === "queue")} onClick={() => setTab("queue")}>
            {t("admin.weightReview.tab.queue", "Review Queue")}
          </button>
          <button style={tabStyle(tab === "audit")} onClick={() => setTab("audit")}>
            {t("admin.weightReview.tab.audit", "Audit Trail")}
          </button>
        </div>

        {/* ── Review Queue tab ── */}
        {tab === "queue" && (
          <>
            {/* Filter toolbar */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
              <select
                className={inputCls}
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setExpandedId(null); }}
                style={{ maxWidth: 200 }}
              >
                {STATUS_FILTER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {statusFilter && (
                <Button size="sm" variant="ghost" onClick={() => { setStatusFilter(""); setExpandedId(null); }}>
                  Clear filter
                </Button>
              )}
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                {queueRows.length} request{queueRows.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {t("admin.weightReview.table.id", "ID")}
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)" }}>
                    {t("admin.weightReview.table.title", "Title")}
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)" }}>
                    {t("admin.weightReview.table.status", "Status")}
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)" }}>
                    {t("admin.weightReview.table.career", "Career")}
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)" }}>
                    {t("admin.weightReview.table.createdBy", "Created by")}
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {t("admin.weightReview.table.createdAt", "Created")}
                  </th>
                </tr>
              </thead>
              {renderTableRows(queueRows, true)}
            </table>
          </>
        )}

        {/* ── Audit Trail tab ── */}
        {tab === "audit" && (
          <>
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                {t("admin.weightReview.auditSubtitle",
                  "Chronological lifecycle history of all weight change requests. Read-only audit trail."
                )}
              </p>
            </div>

            {/* All-statuses table — most recent first */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)" }}>
                    {t("admin.weightReview.table.id", "ID")}
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)" }}>
                    {t("admin.weightReview.table.title", "Title")}
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)" }}>
                    {t("admin.weightReview.table.status", "Status")}
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)" }}>
                    {t("admin.weightReview.table.career", "Career")}
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)" }}>
                    {t("admin.weightReview.table.createdBy", "Created by")}
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {t("admin.weightReview.table.createdAt", "Created")}
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)" }}>
                    {t("admin.weightReview.table.reviewedBy", "Reviewed by")}
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "var(--text-muted)" }}>
                    {t("admin.weightReview.table.vectors", "Vectors")}
                  </th>
                </tr>
              </thead>
              {renderTableRows(
                [...requests].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
                false
              )}
            </table>
          </>
        )}
      </SkeletonPage>

      {/* ── Promote confirmation modal ── */}
      {promoteId && (
        <AdminModal
          title={t("admin.weightReview.promoteConfirm.title", "Promote to live?")}
          onClose={() => setPromoteId(null)}
        >
          <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 20 }}>
            <p style={{ margin: "0 0 12px" }}>
              {t("admin.weightReview.promoteConfirm.body",
                "This will write live keyskill weights and recompute career vectors."
              )}
            </p>
            <div style={{ padding: "10px 14px", borderRadius: 6, background: "#fefce8", border: "1px solid #fde68a", fontSize: 12, color: "#854d0e" }}>
              ⚠ This action cannot be undone.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setPromoteId(null)}>
              {t("admin.weightReview.promoteConfirm.cancel", "Cancel")}
            </Button>
            <Button onClick={() => doPromote(promoteId)}>
              {t("admin.weightReview.promoteConfirm.confirm", "Yes, promote to live")}
            </Button>
          </div>
        </AdminModal>
      )}
    </>
  );
}
