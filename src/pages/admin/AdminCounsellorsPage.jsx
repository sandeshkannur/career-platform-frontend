// src/pages/admin/AdminCounsellorsPage.jsx
import { useState, useEffect, useCallback, Fragment } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../apiClient";

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────────────────────── */
const PAGE_SIZE = 50;

const CREATE_FIELDS = [
  { key: "full_name",    label: "Full Name",    type: "text",     required: true,  placeholder: "e.g. Anita Rao",           gridSpan: 2 },
  { key: "email",        label: "Email",        type: "text",     required: true,  placeholder: "e.g. anita@example.com",   gridSpan: 1 },
  { key: "password",     label: "Password",     type: "password", required: true,  placeholder: "Min. 8 characters",        gridSpan: 1 },
  { key: "dob",          label: "Date of Birth", type: "date",    required: true,  placeholder: "",                         gridSpan: 1 },
  { key: "phone_number", label: "Phone",        type: "text",     required: false, placeholder: "e.g. +91 98765 43210",     gridSpan: 1 },
];

const EMPTY_CREATE_FORM = Object.fromEntries(CREATE_FIELDS.map(f => [f.key, ""]));

const INPUT_CLS = [
  "rounded-md border border-[var(--border)] bg-white px-3 py-2",
  "text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]",
  "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1",
].join(" ");

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────────────────────── */
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

function ActiveBadge({ isActive }) {
  return isActive
    ? <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#dcfce7", color: "#166534" }}>Active</span>
    : <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#fee2e2", color: "#991b1b" }}>Inactive</span>;
}

/* Shared drill-down styles */
const microLabel = {
  fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2,
};

/* ─────────────────────────────────────────────────────────────────────────
   KPI CARD — drill-down summary blocks
────────────────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, big = false }) {
  return (
    <div style={{
      background: "#f8fafc", borderRadius: 8, padding: "12px 14px",
      border: "1px solid var(--border)",
    }}>
      <div style={{
        fontSize: big ? 22 : 14, fontWeight: 700, color: "var(--brand-primary)",
        fontFamily: big ? "monospace" : "inherit", lineHeight: 1.2,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   DOWNLOAD ACTIVITY PANEL — GET /v1/admin/counsellors/{id}/download-activity
────────────────────────────────────────────────────────────────────────── */
function DownloadActivityPanel({ counsellorId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = useCallback(async (from, to) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from_date", from);
      // to_date is a timestamp lower-bounded at midnight; push it to end of
      // day so the selected day's downloads are included.
      if (to) params.set("to_date", `${to}T23:59:59`);
      const qs = params.toString();
      const d = await apiGet(`/v1/admin/counsellors/${counsellorId}/download-activity${qs ? `?${qs}` : ""}`);
      setData(d);
    } catch (e) {
      setError(e.message || "Failed to load download activity.");
    } finally {
      setLoading(false);
    }
  }, [counsellorId]);

  useEffect(() => { load("", ""); }, [load]);

  const summary = data?.summary ?? {};
  const perStudent = Array.isArray(data?.per_student) ? data.per_student : [];
  const hasDateFilter = fromDate || toDate;

  return (
    <div>
      {/* Date-range filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>From</span>
          <input
            type="date"
            className={INPUT_CLS}
            style={{ maxWidth: 150 }}
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>To</span>
          <input
            type="date"
            className={INPUT_CLS}
            style={{ maxWidth: 150 }}
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={() => load(fromDate, toDate)} disabled={loading}>
          {loading ? "Loading…" : "Apply"}
        </Button>
        {hasDateFilter && (
          <Button size="sm" variant="ghost" disabled={loading}
            onClick={() => { setFromDate(""); setToDate(""); load("", ""); }}>
            Clear dates
          </Button>
        )}
      </div>

      {error && (
        <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}

      {loading && !data ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "12px 0" }}>Loading download activity…</p>
      ) : data && (
        <>
          {/* Summary KPI cards */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10, marginBottom: 16,
          }}>
            <KpiCard label="Total downloads"   value={summary.total_downloads ?? 0} big />
            <KpiCard label="Distinct students" value={summary.distinct_students ?? 0} big />
            <KpiCard label="First download"    value={fmtDateTime(summary.first_downloaded_at)} />
            <KpiCard label="Last download"     value={fmtDateTime(summary.last_downloaded_at)} />
          </div>

          {/* Per-student breakdown */}
          <div style={microLabel}>Per-student breakdown</div>
          {perStudent.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "8px 0", margin: 0 }}>
              No downloads recorded for this counsellor{hasDateFilter ? " in the selected date range" : ""}.
            </p>
          ) : (
            <div style={{ overflowX: "auto", marginTop: 6 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left", background: "#f1f5f9" }}>
                    {["Student", "Downloads", "Last Downloaded"].map(h => (
                      <th key={h} style={{ padding: "6px 10px", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perStudent.map(row => (
                    <tr key={row.student_id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "6px 10px", fontWeight: 600 }}>
                        {row.student_name || `Student #${row.student_id}`}
                        <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6, fontFamily: "monospace" }}>
                          #{row.student_id}
                        </span>
                      </td>
                      <td style={{ padding: "6px 10px", fontFamily: "monospace", fontWeight: 700 }}>{row.downloads}</td>
                      <td style={{ padding: "6px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {fmtDateTime(row.last_downloaded_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ASSIGNMENTS PANEL (read-only) — GET /v1/admin/counsellor-assignments
────────────────────────────────────────────────────────────────────────── */
function AssignmentsPanel({ counsellorId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await apiGet(`/v1/admin/counsellor-assignments?counsellor_id=${counsellorId}`);
      setData(d);
    } catch (e) {
      setError(e.message || "Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  }, [counsellorId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "12px 0" }}>Loading caseload…</p>;
  }
  if (error) {
    return (
      <div style={{ padding: "12px 0" }}>
        <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 10 }}>{error}</p>
        <Button size="sm" variant="secondary" onClick={load}>Retry</Button>
      </div>
    );
  }

  const assignments = Array.isArray(data?.assignments) ? data.assignments : [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={microLabel}>
          Active assignments ({data?.total ?? assignments.length})
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
          Read-only — assigning students is managed separately.
        </span>
      </div>

      {assignments.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "8px 0", margin: 0 }}>
          No students assigned to this counsellor yet.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left", background: "#f1f5f9" }}>
                {["Student", "Assignment Type", "Assigned At"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assignments.map(a => (
                <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 10px", fontWeight: 600 }}>
                    {a.student_name || `Student #${a.student_id}`}
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                      background: "#dbeafe", color: "#1e40af",
                    }}>
                      {(a.assignment_type || "—").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ padding: "6px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {fmtDateTime(a.assigned_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   DRILL-DOWN PANEL — expanded row with Activity / Assignments tabs
────────────────────────────────────────────────────────────────────────── */
function CounsellorDrillDown({ counsellor }) {
  const [drillTab, setDrillTab] = useState("activity");

  const tabStyle = (active) => ({
    padding: "8px 18px", fontSize: 13, fontWeight: active ? 700 : 500,
    border: "none", background: "transparent", cursor: "pointer",
    color: active ? "#0d9488" : "var(--text-muted)",
    borderBottom: active ? "2px solid #0d9488" : "2px solid transparent",
    marginBottom: -1, fontFamily: "inherit",
  });

  return (
    <tr>
      <td colSpan={6} style={{ padding: 0, borderBottom: "2px solid var(--border)" }}>
        <div style={{ background: "#f0f7ff", borderTop: "2px solid #bfdbfe", padding: "14px 20px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            {counsellor.full_name}
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)", marginLeft: 10 }}>
              {counsellor.email}
            </span>
          </div>

          {/* Drill-down tab bar */}
          <div style={{ display: "flex", borderBottom: "1px solid #bfdbfe", marginBottom: 14 }}>
            <button style={tabStyle(drillTab === "activity")} onClick={() => setDrillTab("activity")}>
              Download Activity
            </button>
            <button style={tabStyle(drillTab === "assignments")} onClick={() => setDrillTab("assignments")}>
              Assignments
            </button>
          </div>

          {drillTab === "activity"    && <DownloadActivityPanel counsellorId={counsellor.id} />}
          {drillTab === "assignments" && <AssignmentsPanel counsellorId={counsellor.id} />}
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE
────────────────────────────────────────────────────────────────────────── */
export default function AdminCounsellorsPage() {
  const [counsellors, setCounsellors] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedId, setExpandedId] = useState(null);

  const [formMode, setFormMode] = useState(null); // null | "create" | counsellor object
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [editActive, setEditActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const [deactivatingId, setDeactivatingId] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  /* ─── load list ─── */
  const loadCounsellors = useCallback(async (nextOffset = 0) => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet(`/v1/admin/counsellors?limit=${PAGE_SIZE}&offset=${nextOffset}`);
      setCounsellors(Array.isArray(data?.counsellors) ? data.counsellors : []);
      setTotal(data?.total ?? 0);
      setOffset(nextOffset);
    } catch (e) {
      setError(e.message || "Failed to load counsellors.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCounsellors(0); }, [loadCounsellors]);

  /* ─── form helpers ─── */
  const openCreate = () => {
    setForm(EMPTY_CREATE_FORM);
    setFormError("");
    setNotice("");
    setFormMode("create");
    setExpandedId(null);
  };

  const openEdit = (counsellor) => {
    setForm({
      ...EMPTY_CREATE_FORM,
      full_name: counsellor.full_name ?? "",
      email: counsellor.email ?? "",
    });
    setEditActive(counsellor.is_active !== false);
    setFormError("");
    setNotice("");
    setFormMode(counsellor);
    setExpandedId(null);
  };

  const closeForm = () => {
    setFormMode(null);
    setForm(EMPTY_CREATE_FORM);
    setFormError("");
  };

  const isEditing = formMode && formMode !== "create";

  const handleSave = async () => {
    if (!form.full_name.trim()) { setFormError("Full name is required."); return; }
    if (!form.email.trim())     { setFormError("Email is required.");     return; }
    if (formMode === "create") {
      if (!form.password || form.password.length < 8) {
        setFormError("Password is required (min. 8 characters).");
        return;
      }
      if (!form.dob) { setFormError("Date of birth is required."); return; }
    }
    setSaving(true);
    setFormError("");
    try {
      if (formMode === "create") {
        await apiPost("/v1/admin/counsellors", {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          password: form.password,
          dob: form.dob,
          phone_number: form.phone_number.trim() || null,
        });
        setNotice(`Counsellor "${form.full_name.trim()}" created.`);
      } else {
        await apiPatch(`/v1/admin/counsellors/${formMode.id}`, {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          is_active: editActive,
        });
        setNotice(`Counsellor "${form.full_name.trim()}" updated.`);
      }
      closeForm();
      await loadCounsellors(formMode === "create" ? 0 : offset);
    } catch (e) {
      setFormError(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ─── deactivate (soft delete) ─── */
  const handleDeactivateConfirm = async () => {
    setDeactivating(true);
    try {
      await apiDelete(`/v1/admin/counsellors/${deactivatingId}`);
      const name = counsellors.find(c => c.id === deactivatingId)?.full_name;
      setNotice(`Counsellor "${name ?? deactivatingId}" deactivated.`);
      setDeactivatingId(null);
      await loadCounsellors(offset);
    } catch (e) {
      setError(e.message || "Deactivate failed.");
      setDeactivatingId(null);
    } finally {
      setDeactivating(false);
    }
  };

  /* ─── pagination ─── */
  const from = total === 0 ? 0 : offset + 1;
  const to = offset + counsellors.length;
  const prevDisabled = loading || offset === 0;
  const nextDisabled = loading || offset + PAGE_SIZE >= total;

  /* ─── form field renderer ─── */
  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 600,
    marginBottom: 4, color: "var(--text-primary)",
  };

  const renderFormField = ({ key, label, type, required, placeholder, gridSpan }) => (
    <div key={key} style={{ gridColumn: `span ${gridSpan}` }}>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>}
      </label>
      <input
        type={type}
        className={INPUT_CLS}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: "100%" }}
      />
    </div>
  );

  /* ─── render ─── */
  return (
    <SkeletonPage
      title="Counsellor Management"
      subtitle={loading ? "Loading…" : `${total} counsellor account${total !== 1 ? "s" : ""}`}
      loading={loading && counsellors.length === 0 && !error}
      error={!loading ? error : ""}
      onRetry={() => loadCounsellors(offset)}
      actions={
        !error && (
          <Button onClick={openCreate} disabled={formMode !== null || loading}>
            + New Counsellor
          </Button>
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
      {/* ── Success notice ── */}
      {notice && (
        <div style={{
          marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13,
          background: "#dcfce7", border: "1px solid #86efac", color: "#166534",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>✓ {notice}</span>
          <button
            onClick={() => setNotice("")}
            style={{ background: "none", border: "none", color: "#166534", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Create / Edit form ── */}
      {formMode !== null && (
        <Card className="mb-6">
          <h2 style={{ margin: "0 0 16px", fontSize: "var(--font-size-lg)", fontWeight: 700 }}>
            {isEditing ? `Edit — ${formMode.full_name}` : "Create Counsellor Account"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            {isEditing ? (
              <>
                {CREATE_FIELDS.filter(f => f.key === "full_name" || f.key === "email").map(renderFormField)}
                <div style={{ gridColumn: "span 1" }}>
                  <label style={labelStyle}>Status</label>
                  <select
                    className={INPUT_CLS}
                    value={editActive ? "active" : "inactive"}
                    onChange={e => setEditActive(e.target.value === "active")}
                    style={{ width: "100%" }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </>
            ) : (
              CREATE_FIELDS.map(renderFormField)
            )}
          </div>
          {formError && (
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#dc2626" }}>{formError}</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : isEditing ? "Save changes" : "Create Counsellor"}
            </Button>
            <Button variant="secondary" onClick={closeForm} disabled={saving}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* ── Deactivate confirmation ── */}
      {deactivatingId !== null && (
        <Card className="mb-6">
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-primary)" }}>
            Deactivate <strong>{counsellors.find(c => c.id === deactivatingId)?.full_name}</strong>?
            Their account will be marked inactive; assignment and download history is kept for audit.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="danger" onClick={handleDeactivateConfirm} disabled={deactivating}>
              {deactivating ? "Deactivating…" : "Yes, deactivate"}
            </Button>
            <Button variant="secondary" onClick={() => setDeactivatingId(null)} disabled={deactivating}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* ── Table ── */}
      {counsellors.length === 0 && !loading ? (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
          No counsellor accounts yet. Use “+ New Counsellor” to create the first one.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                {["Name", "Email", "Phone", "Date of Birth", "Status", "Actions"].map(h => (
                  <th key={h} style={{
                    padding: "8px 10px", fontWeight: 700,
                    color: "var(--text-muted)", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {counsellors.map((c, idx) => {
                const isInactive = c.is_active === false;
                const isExpanded = expandedId === c.id;

                return (
                  <Fragment key={c.id}>
                    <tr style={{
                      borderBottom: isExpanded ? "none" : "1px solid var(--border)",
                      background: isExpanded
                        ? "#dbeafe"
                        : isInactive
                          ? (idx % 2 === 0 ? "#fafafa" : "#f3f4f6")
                          : (idx % 2 === 0 ? "transparent" : "var(--bg-app)"),
                      opacity: isInactive ? 0.65 : 1,
                    }}>
                      {/* Name — clickable to expand */}
                      <td style={{ padding: "9px 10px", fontWeight: 600, maxWidth: 200 }}>
                        <span
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          style={{
                            color: "#0d9488", cursor: "pointer",
                            textDecoration: isExpanded ? "underline" : "none",
                            whiteSpace: "nowrap",
                          }}
                          title="Click to view activity and assignments"
                        >
                          {c.full_name}
                        </span>
                        {isExpanded && <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>▲</span>}
                      </td>

                      <td style={{ padding: "9px 10px", color: "var(--text-muted)", maxWidth: 220 }}>
                        {c.email || "—"}
                      </td>

                      <td style={{ padding: "9px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {c.phone_number || "—"}
                      </td>

                      <td style={{ padding: "9px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {fmtDate(c.dob)}
                      </td>

                      <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                        <ActiveBadge isActive={!isInactive} />
                      </td>

                      <td style={{ padding: "9px 10px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Button size="sm" variant="secondary"
                            onClick={() => openEdit(c)}
                            disabled={formMode !== null || deactivatingId !== null}>
                            Edit
                          </Button>
                          {!isInactive && (
                            <Button size="sm" variant="danger"
                              onClick={() => { setDeactivatingId(c.id); setNotice(""); }}
                              disabled={formMode !== null || deactivatingId !== null}>
                              Deactivate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && <CounsellorDrillDown counsellor={c} />}
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
              onClick={() => { setExpandedId(null); loadCounsellors(Math.max(0, offset - PAGE_SIZE)); }}>
              ← Prev
            </Button>
            <Button size="sm" variant="secondary" disabled={nextDisabled}
              onClick={() => { setExpandedId(null); loadCounsellors(offset + PAGE_SIZE); }}>
              Next →
            </Button>
          </div>
        </div>
      )}
    </SkeletonPage>
  );
}
