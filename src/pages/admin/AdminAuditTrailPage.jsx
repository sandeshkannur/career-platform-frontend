// src/pages/admin/AdminAuditTrailPage.jsx
import { useState, useEffect, useMemo, Fragment } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import { apiGet } from "../../apiClient";

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────────────────────── */
const ENTITY_TYPE_OPTIONS = [
  { value: "",               label: "All Entity Types" },
  { value: "career",         label: "Career" },
  { value: "cluster",        label: "Cluster" },
  { value: "key_skill",      label: "Key Skill" },
  { value: "sme_profile",    label: "SME Profile" },
  { value: "sme_submission", label: "SME Submission" },
  { value: "fit_band",       label: "Fit Band" },
  { value: "cps_factor",     label: "CPS Factor" },
  { value: "aq",             label: "AQ" },
];

const ACTION_OPTIONS = [
  { value: "",        label: "All Actions" },
  { value: "create",  label: "Create" },
  { value: "update",  label: "Update" },
  { value: "delete",  label: "Delete" },
  { value: "approve", label: "Approve" },
  { value: "reject",  label: "Reject" },
];

const ACTION_META = {
  create:  { label: "Create",  bg: "#dcfce7", color: "#166534" },
  update:  { label: "Update",  bg: "#dbeafe", color: "#1e40af" },
  delete:  { label: "Delete",  bg: "#fee2e2", color: "#991b1b" },
  approve: { label: "Approve", bg: "#dcfce7", color: "#166534" },
  reject:  { label: "Reject",  bg: "#fee2e2", color: "#991b1b" },
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
   EXPANDED DETAIL ROW
────────────────────────────────────────────────────────────────────────── */
function ExpandedDetails({ entry }) {
  const details =
    entry.details && typeof entry.details === "object"
      ? entry.details
      : null;

  const microLabel = {
    fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2,
  };

  return (
    <tr>
      <td colSpan={6} style={{ padding: 0, borderBottom: "2px solid var(--border)" }}>
        <div style={{
          background: "#f0f7ff",
          borderTop: "2px solid #bfdbfe",
          padding: "14px 20px",
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.06em",
            marginBottom: 12, paddingBottom: 6,
            borderBottom: "1px solid #bfdbfe",
          }}>
            Change Details
          </div>

          {!details || Object.keys(details).length === 0 ? (
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
              No additional details recorded.
            </span>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "10px 24px",
            }}>
              {Object.entries(details).map(([k, v]) => {
                if (v == null) return null;
                const display = typeof v === "object"
                  ? JSON.stringify(v, null, 2)
                  : String(v);
                return (
                  <div key={k}>
                    <div style={microLabel}>{snakeToTitle(k)}</div>
                    <div style={{
                      fontSize: 12, color: "var(--text-primary)",
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                      lineHeight: 1.5,
                    }}>
                      {display}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE
────────────────────────────────────────────────────────────────────────── */
export default function AdminAuditTrailPage() {
  const [entries,      setEntries]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");

  /* ── filters ── */
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userSearch,   setUserSearch]   = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");

  /* ── expand ── */
  const [expandedId, setExpandedId] = useState(null);

  /* ─── load ─── */
  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet("/v1/admin/audit-trail");
      const list = Array.isArray(data) ? data : (data?.entries ?? data?.audit_trail ?? []);
      // Most-recent first
      setEntries([...list].sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return new Date(b.timestamp) - new Date(a.timestamp);
      }));
    } catch (e) {
      setError(e.message || "Failed to load audit trail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  /* ─── client-side filtering ─── */
  const filtered = useMemo(() => {
    let list = entries;

    if (entityFilter) {
      list = list.filter(e => e.entity_type === entityFilter);
    }
    if (actionFilter) {
      list = list.filter(e => e.action === actionFilter);
    }
    if (userSearch.trim()) {
      const q = userSearch.trim().toLowerCase();
      list = list.filter(e => e.user_email?.toLowerCase().includes(q));
    }
    if (dateFrom) {
      list = list.filter(e => e.timestamp && e.timestamp >= dateFrom);
    }
    if (dateTo) {
      // Include the full end day
      const toEnd = dateTo + "T23:59:59.999Z";
      list = list.filter(e => e.timestamp && e.timestamp <= toEnd);
    }

    return list;
  }, [entries, entityFilter, actionFilter, userSearch, dateFrom, dateTo]);

  /* ─── derived subtitle ─── */
  const subtitleText = () => {
    if (loading) return "Loading…";
    const n = filtered.length;
    if (actionFilter && entityFilter) {
      return `${n} ${ACTION_META[actionFilter]?.label ?? actionFilter} ${snakeToTitle(entityFilter)} entr${n !== 1 ? "ies" : "y"}`;
    }
    if (actionFilter) {
      return `${n} ${ACTION_META[actionFilter]?.label ?? actionFilter} entr${n !== 1 ? "ies" : "y"}`;
    }
    return `${n} audit entr${n !== 1 ? "ies" : "y"}`;
  };

  const hasFilters = entityFilter || actionFilter || userSearch || dateFrom || dateTo;

  const clearFilters = () => {
    setEntityFilter("");
    setActionFilter("");
    setUserSearch("");
    setDateFrom("");
    setDateTo("");
    setExpandedId(null);
  };

  /* ─── render ─── */
  return (
    <SkeletonPage
      title="Audit Trail"
      subtitle={subtitleText()}
      loading={loading}
      error={!loading ? error : ""}
      onRetry={loadAll}
      actions={
        !loading && !error && (
          <Button size="sm" variant="secondary" onClick={loadAll}>Refresh</Button>
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
          This is an <strong>append-only</strong> audit log. Entries cannot be modified or deleted.
        </span>
      </div>

      {/* ── Filter row ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>

        {/* Entity Type */}
        <select
          className={INPUT_CLS}
          style={{ maxWidth: 180 }}
          value={entityFilter}
          onChange={e => { setEntityFilter(e.target.value); setExpandedId(null); }}
        >
          {ENTITY_TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Action */}
        <select
          className={INPUT_CLS}
          style={{ maxWidth: 150 }}
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setExpandedId(null); }}
        >
          {ACTION_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* User email search */}
        <input
          className={INPUT_CLS}
          style={{ maxWidth: 220 }}
          placeholder="Search by user email…"
          value={userSearch}
          onChange={e => { setUserSearch(e.target.value); setExpandedId(null); }}
        />

        {/* Date from */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>From</span>
          <input
            type="date"
            className={INPUT_CLS}
            style={{ maxWidth: 150 }}
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setExpandedId(null); }}
          />
        </div>

        {/* Date to */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>To</span>
          <input
            type="date"
            className={INPUT_CLS}
            style={{ maxWidth: 150 }}
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setExpandedId(null); }}
          />
        </div>

        {/* Entry count */}
        <span style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {filtered.length} audit {filtered.length !== 1 ? "entries" : "entry"}
        </span>

        {/* Clear filters */}
        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "40px 24px",
          color: "var(--text-muted)", fontSize: 13,
        }}>
          {entries.length === 0
            ? "No audit entries yet. Actions performed in admin panels will be logged here."
            : "No audit entries match the current filters."
          }
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                {["Timestamp", "Action", "Entity Type", "Entity Name", "User", "Details"].map(h => (
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
              {filtered.map((entry, idx) => {
                const isExpanded = expandedId === entry.id;
                const actionMeta = ACTION_META[entry.action] ?? {
                  label: snakeToTitle(entry.action ?? "—"),
                  bg: "#f3f4f6", color: "#374151",
                };
                const hasDetails =
                  entry.details &&
                  typeof entry.details === "object" &&
                  Object.keys(entry.details).length > 0;

                return (
                  <Fragment key={entry.id ?? idx}>
                    <tr style={{
                      borderBottom: isExpanded ? "none" : "1px solid var(--border)",
                      background: isExpanded
                        ? "#dbeafe"
                        : idx % 2 === 0 ? "transparent" : "var(--bg-app)",
                    }}>

                      {/* Timestamp */}
                      <td style={{
                        padding: "9px 10px",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                        fontSize: 12,
                      }}>
                        {formatTimestamp(entry.timestamp)}
                      </td>

                      {/* Action badge */}
                      <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                        <span style={{
                          display: "inline-block",
                          fontSize: 11, fontWeight: 600,
                          padding: "2px 8px", borderRadius: 4,
                          background: actionMeta.bg, color: actionMeta.color,
                        }}>
                          {actionMeta.label}
                        </span>
                      </td>

                      {/* Entity Type badge */}
                      <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                        <span style={{
                          display: "inline-block",
                          fontSize: 11, fontWeight: 600,
                          padding: "2px 8px", borderRadius: 4,
                          background: "#f3f4f6", color: "#374151",
                        }}>
                          {snakeToTitle(entry.entity_type ?? "—")}
                        </span>
                      </td>

                      {/* Entity Name */}
                      <td style={{
                        padding: "9px 10px",
                        maxWidth: 200, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                        fontWeight: 500,
                      }}>
                        {entry.entity_name ?? "—"}
                      </td>

                      {/* User */}
                      <td style={{
                        padding: "9px 10px",
                        color: "var(--text-muted)",
                        maxWidth: 200,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {entry.user_email ?? "—"}
                      </td>

                      {/* Details expand toggle */}
                      <td style={{ padding: "9px 10px" }}>
                        {hasDetails ? (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            style={{
                              fontSize: 11, fontWeight: 600,
                              padding: "3px 8px", borderRadius: 4,
                              border: "1px solid var(--border)",
                              cursor: "pointer", fontFamily: "inherit",
                              background: isExpanded ? "#dbeafe" : "#f9fafb",
                              color: isExpanded ? "#1e40af" : "var(--text-primary)",
                            }}
                          >
                            {isExpanded ? "▲ Hide" : "▼ Show"}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>—</span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded detail panel */}
                    {isExpanded && <ExpandedDetails entry={entry} />}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </SkeletonPage>
  );
}
