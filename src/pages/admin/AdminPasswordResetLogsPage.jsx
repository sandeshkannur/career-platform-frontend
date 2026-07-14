// src/pages/admin/AdminPasswordResetLogsPage.jsx
import { useState, useEffect, useCallback, Fragment } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import { apiGet } from "../../apiClient";

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────────────────────── */
const PAGE_SIZE = 50;

const METHOD_OPTIONS = [
  { value: "",              label: "All Methods" },
  { value: "self_change",   label: "Self Change" },
  { value: "forgot_email",  label: "Forgot (Email)" },
  { value: "forgot_mobile", label: "Forgot (Mobile)" },
  { value: "admin_reset",   label: "Admin Reset" },
];

const STATUS_OPTIONS = [
  { value: "",          label: "All Statuses" },
  { value: "requested",  label: "Requested" },
  { value: "otp_sent",   label: "OTP Sent" },
  { value: "verified",   label: "Verified" },
  { value: "completed",  label: "Completed" },
  { value: "failed",     label: "Failed" },
  { value: "expired",    label: "Expired" },
  { value: "rejected",   label: "Rejected" },
];

const METHOD_META = {
  self_change:   { label: "Self Change",       bg: "#dbeafe", color: "#1e40af" },
  forgot_email:  { label: "Forgot (Email)",    bg: "#ede9fe", color: "#5b21b6" },
  forgot_mobile: { label: "Forgot (Mobile)",   bg: "#ede9fe", color: "#5b21b6" },
  admin_reset:   { label: "Admin Reset",       bg: "#ffedd5", color: "#9a3412" },
};

const STATUS_META = {
  requested: { label: "Requested", bg: "#f3f4f6", color: "#374151" },
  otp_sent:  { label: "OTP Sent",  bg: "#dbeafe", color: "#1e40af" },
  verified:  { label: "Verified",  bg: "#ccfbf1", color: "#0f766e" },
  completed: { label: "Completed", bg: "#dcfce7", color: "#166534" },
  failed:    { label: "Failed",    bg: "#fee2e2", color: "#991b1b" },
  expired:   { label: "Expired",   bg: "#fef3c7", color: "#92400e" },
  rejected:  { label: "Rejected",  bg: "#fee2e2", color: "#991b1b" },
};

/* ─────────────────────────────────────────────────────────────────────────
   MODULE-LEVEL STYLES
────────────────────────────────────────────────────────────────────────── */
const INPUT_CLS = [
  "rounded-md border border-[var(--border)] bg-white px-3 py-2",
  "text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]",
  "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1",
].join(" ");

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────────────────────── */
function snakeToTitle(str) {
  if (!str) return "—";
  return String(str)
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatTimestamp(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch {
    return dateStr;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   EXPANDED DETAIL ROW — non-columnar fields (token correlation id, UA)
────────────────────────────────────────────────────────────────────────── */
function ExpandedDetails({ entry }) {
  const microLabel = {
    fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2,
  };

  return (
    <tr>
      <td colSpan={7} style={{ padding: 0, borderBottom: "2px solid var(--border)" }}>
        <div style={{
          background: "#f0f7ff",
          borderTop: "2px solid #bfdbfe",
          padding: "14px 20px",
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "10px 24px",
          }}>
            <div>
              <div style={microLabel}>Token JTI</div>
              <div style={{ fontSize: 12, color: "var(--text-primary)", fontFamily: "monospace", wordBreak: "break-all" }}>
                {entry.token_jti || "—"}
              </div>
            </div>
            <div>
              <div style={microLabel}>User Agent</div>
              <div style={{ fontSize: 12, color: "var(--text-primary)", wordBreak: "break-word" }}>
                {entry.user_agent || "—"}
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE
────────────────────────────────────────────────────────────────────────── */
export default function AdminPasswordResetLogsPage() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ── filters ── */
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userIdInput, setUserIdInput] = useState("");
  const [appliedUserId, setAppliedUserId] = useState("");

  /* ── expand ── */
  const [expandedKey, setExpandedKey] = useState(null);

  /* ─── load ─── */
  const loadPage = useCallback(async (pageNum) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("page_size", String(PAGE_SIZE));
      if (methodFilter) params.set("method", methodFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (appliedUserId) params.set("user_id", appliedUserId);

      const data = await apiGet(`/v1/admin/password-reset-logs?${params.toString()}`);
      setEntries(Array.isArray(data?.items) ? data.items : []);
      setTotal(data?.total ?? 0);
      setPage(data?.page ?? pageNum);
    } catch (e) {
      setError(e.message || "Failed to load password reset logs.");
    } finally {
      setLoading(false);
    }
  }, [methodFilter, statusFilter, appliedUserId]);

  useEffect(() => { loadPage(1); }, [loadPage]);

  const applyUserIdFilter = () => {
    setAppliedUserId(userIdInput.trim());
    setExpandedKey(null);
  };

  const hasFilters = methodFilter || statusFilter || appliedUserId;

  const clearFilters = () => {
    setMethodFilter("");
    setStatusFilter("");
    setUserIdInput("");
    setAppliedUserId("");
    setExpandedKey(null);
  };

  /* ─── pagination ─── */
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = (page - 1) * PAGE_SIZE + entries.length;
  const prevDisabled = loading || page <= 1;
  const nextDisabled = loading || page * PAGE_SIZE >= total;

  const subtitleText = loading
    ? "Loading…"
    : `${total} password reset log entr${total !== 1 ? "ies" : "y"}`;

  return (
    <SkeletonPage
      title="Password Reset Logs"
      subtitle={subtitleText}
      loading={loading && entries.length === 0 && !error}
      error={!loading ? error : ""}
      onRetry={() => loadPage(page)}
      actions={
        !loading && !error && (
          <Button size="sm" variant="secondary" onClick={() => loadPage(page)}>Refresh</Button>
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
      {/* ── Append-only info note ── */}
      <div style={{
        padding: "10px 14px", borderRadius: 8, marginBottom: 18,
        background: "#eff6ff", border: "1px solid #bfdbfe",
        fontSize: 13, color: "#1e40af",
        display: "flex", gap: 10, alignItems: "center",
      }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>ℹ</span>
        <span>
          This is an <strong>append-only</strong> audit log of password reset activity. Entries cannot be modified or deleted.
        </span>
      </div>

      {/* ── Filter row ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {/* Method */}
        <select
          className={INPUT_CLS}
          style={{ maxWidth: 180 }}
          value={methodFilter}
          onChange={e => { setMethodFilter(e.target.value); setExpandedKey(null); }}
        >
          {METHOD_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Status */}
        <select
          className={INPUT_CLS}
          style={{ maxWidth: 160 }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setExpandedKey(null); }}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* User ID search */}
        <input
          className={INPUT_CLS}
          style={{ maxWidth: 160 }}
          placeholder="User ID…"
          value={userIdInput}
          onChange={e => setUserIdInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") applyUserIdFilter(); }}
        />
        <Button size="sm" variant="secondary" onClick={applyUserIdFilter} disabled={loading}>
          Apply
        </Button>

        {/* Clear filters */}
        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters} disabled={loading}>
            Clear filters
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      {entries.length === 0 && !loading ? (
        <div style={{
          textAlign: "center", padding: "40px 24px",
          color: "var(--text-muted)", fontSize: 13,
        }}>
          {hasFilters
            ? "No password reset log entries match the current filters."
            : "No password reset activity has been logged yet."}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                {["Timestamp", "User", "Method", "Status", "Reason", "Initiated By", "IP"].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 10px", fontWeight: 700,
                      color: "var(--text-muted)", whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                const key = entry.id ?? entry.token_jti ?? idx;
                const isExpanded = expandedKey === key;
                const methodMeta = METHOD_META[entry.method] ?? {
                  label: snakeToTitle(entry.method ?? "—"),
                  bg: "#f3f4f6", color: "#374151",
                };
                const statusMeta = STATUS_META[entry.status] ?? {
                  label: snakeToTitle(entry.status ?? "—"),
                  bg: "#f3f4f6", color: "#374151",
                };

                return (
                  <Fragment key={key}>
                    <tr
                      onClick={() => setExpandedKey(isExpanded ? null : key)}
                      style={{
                        cursor: "pointer",
                        borderBottom: isExpanded ? "none" : "1px solid var(--border)",
                        background: isExpanded
                          ? "#dbeafe"
                          : idx % 2 === 0 ? "transparent" : "var(--bg-app)",
                      }}
                    >
                      <td style={{ padding: "9px 10px", color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: 12 }}>
                        {formatTimestamp(entry.created_at)}
                      </td>

                      <td style={{
                        padding: "9px 10px", maxWidth: 200,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        fontWeight: 500,
                      }}>
                        {entry.user_email ?? "—"}
                      </td>

                      <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                        <span style={{
                          display: "inline-block",
                          fontSize: 11, fontWeight: 600,
                          padding: "2px 8px", borderRadius: 4,
                          background: methodMeta.bg, color: methodMeta.color,
                        }}>
                          {methodMeta.label}
                        </span>
                      </td>

                      <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                        <span style={{
                          display: "inline-block",
                          fontSize: 11, fontWeight: 600,
                          padding: "2px 8px", borderRadius: 4,
                          background: statusMeta.bg, color: statusMeta.color,
                        }}>
                          {statusMeta.label}
                        </span>
                      </td>

                      <td style={{
                        padding: "9px 10px", color: "var(--text-muted)",
                        maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {entry.reason || "—"}
                      </td>

                      <td style={{
                        padding: "9px 10px", color: "var(--text-muted)",
                        maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {entry.initiated_by_admin_email || "—"}
                      </td>

                      <td style={{ padding: "9px 10px", color: "var(--text-muted)", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 12 }}>
                        {entry.ip || "—"}
                      </td>
                    </tr>

                    {isExpanded && <ExpandedDetails entry={entry} />}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {total > PAGE_SIZE && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Showing {from}–{to} of {total}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" variant="secondary" disabled={prevDisabled}
              onClick={() => { setExpandedKey(null); loadPage(page - 1); }}>
              ← Prev
            </Button>
            <Button size="sm" variant="secondary" disabled={nextDisabled}
              onClick={() => { setExpandedKey(null); loadPage(page + 1); }}>
              Next →
            </Button>
          </div>
        </div>
      )}
    </SkeletonPage>
  );
}
