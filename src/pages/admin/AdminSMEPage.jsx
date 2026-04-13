// src/pages/admin/AdminSMEPage.jsx
import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import { apiGet, apiPost, apiPut, apiDelete } from "../../apiClient";

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS — SME Registry
────────────────────────────────────────────────────────────────────────── */
const DOMAIN_OPTIONS = [
  "STEM", "Business", "Healthcare", "Education",
  "Arts", "Law", "Finance", "Government", "Other",
];

const DETAIL_SECTIONS = [
  { title: "Contact", fields: [
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
  ]},
  { title: "Organization", fields: [
    { key: "organization",     label: "Organization" },
    { key: "designation",      label: "Designation" },
    { key: "expertise_domain", label: "Domain",           format: "domain" },
    { key: "years_experience", label: "Years Experience", format: "years" },
    { key: "max_careers",      label: "Max Careers" },
  ]},
  { title: "Notes & Dates", fields: [
    { key: "notes",      label: "Notes",   fullWidth: true },
    { key: "created_at", label: "Created", format: "date" },
    { key: "updated_at", label: "Updated", format: "date" },
  ]},
];

const FORM_FIELDS = [
  { key: "full_name",        label: "Full Name",        type: "text",     required: true,  placeholder: "e.g. Dr. Priya Sharma",          gridSpan: 2 },
  { key: "email",            label: "Email",            type: "text",     required: true,  placeholder: "e.g. priya@example.com",         gridSpan: 1 },
  { key: "phone",            label: "Phone",            type: "text",     required: false, placeholder: "e.g. +91 98765 43210",           gridSpan: 1 },
  { key: "organization",     label: "Organization",     type: "text",     required: false, placeholder: "e.g. IIT Bombay",                gridSpan: 2 },
  { key: "designation",      label: "Designation",      type: "text",     required: false, placeholder: "e.g. Professor",                 gridSpan: 2 },
  { key: "expertise_domain", label: "Expertise Domain", type: "select",   required: false, options: ["", ...DOMAIN_OPTIONS],              gridSpan: 1 },
  { key: "years_experience", label: "Years Experience", type: "number",   required: false, placeholder: "e.g. 12",                        gridSpan: 1 },
  { key: "max_careers",      label: "Max Careers",      type: "number",   required: false, placeholder: "e.g. 3",                         gridSpan: 1 },
  { key: "notes",            label: "Notes",            type: "textarea", required: false, placeholder: "Internal notes about this SME…",  gridSpan: 3 },
];

const EMPTY_FORM = Object.fromEntries(
  FORM_FIELDS.map(f => [f.key, f.key === "max_careers" ? "3" : ""])
);

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS — Submissions
────────────────────────────────────────────────────────────────────────── */
const SUB_STATUS_FILTER_OPTIONS = [
  { value: "",             label: "All Statuses" },
  { value: "received",     label: "Received" },
  { value: "under_review", label: "Under Review" },
  { value: "approved",     label: "Approved" },
  { value: "rejected",     label: "Rejected" },
];

const SUB_STATUS_UPDATE_OPTIONS = [
  { value: "received",     label: "Received" },
  { value: "under_review", label: "Under Review" },
  { value: "approved",     label: "Approved" },
  { value: "rejected",     label: "Rejected" },
];

const STATUS_META = {
  received:     { label: "Received",     bg: "#dbeafe", color: "#1e40af" },
  under_review: { label: "Under Review", bg: "#fef3c7", color: "#92400e" },
  approved:     { label: "Approved",     bg: "#dcfce7", color: "#166534" },
  rejected:     { label: "Rejected",     bg: "#fee2e2", color: "#991b1b" },
};

/* ─────────────────────────────────────────────────────────────────────────
   MODULE-LEVEL SHARED STYLES
────────────────────────────────────────────────────────────────────────── */
const INPUT_CLS = [
  "rounded-md border border-[var(--border)] bg-white px-3 py-2",
  "text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]",
  "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1",
].join(" ");

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

function snakeToTitle(key) {
  return String(key)
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: status || "—", bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 600,
      padding: "2px 8px", borderRadius: 4,
      background: meta.bg, color: meta.color,
    }}>
      {meta.label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   FIELD VALUE RENDERER — SME Registry
────────────────────────────────────────────────────────────────────────── */
function renderFieldValue(value, format) {
  if (value == null || value === "") {
    return <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>;
  }
  if (format === "domain") {
    return (
      <span style={{
        display: "inline-block", fontSize: 11, fontWeight: 600,
        padding: "2px 8px", borderRadius: 4,
        background: "#dbeafe", color: "#1e40af",
      }}>
        {value}
      </span>
    );
  }
  if (format === "years") {
    return <span style={{ fontWeight: 600 }}>{value} yr{value !== 1 ? "s" : ""}</span>;
  }
  if (format === "date") {
    try {
      return (
        <span style={{ color: "var(--text-muted)" }}>
          {new Date(value).toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })}
        </span>
      );
    } catch {
      return <span>{String(value)}</span>;
    }
  }
  return <span style={{ lineHeight: 1.5 }}>{String(value)}</span>;
}

/* ─────────────────────────────────────────────────────────────────────────
   DETAIL PANEL — SME Registry (existing, unchanged)
────────────────────────────────────────────────────────────────────────── */
function DetailPanel({ sme, onEdit }) {
  const assignments = Array.isArray(sme.career_assignments) ? sme.career_assignments : [];

  return (
    <tr>
      <td colSpan={8} style={{ padding: 0, borderBottom: "2px solid var(--border)" }}>
        <div style={{ background: "#f0f7ff", borderTop: "2px solid #bfdbfe", padding: "16px 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              {sme.full_name}
              {sme.expertise_domain && (
                <span style={{
                  display: "inline-block", marginLeft: 10, fontSize: 11, fontWeight: 600,
                  padding: "2px 8px", borderRadius: 4, background: "#dbeafe", color: "#1e40af",
                }}>
                  {sme.expertise_domain}
                </span>
              )}
              {sme.is_active === false && (
                <span style={{
                  display: "inline-block", marginLeft: 8, fontSize: 11, fontWeight: 600,
                  padding: "2px 8px", borderRadius: 4, background: "#fee2e2", color: "#991b1b",
                }}>
                  Inactive
                </span>
              )}
            </span>
            <Button size="sm" onClick={() => onEdit(sme)}>Edit this SME</Button>
          </div>

          {/* Three-column sections */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20,
            marginBottom: assignments.length > 0 ? 16 : 0,
          }}>
            {DETAIL_SECTIONS.map(section => (
              <div key={section.title}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10,
                  paddingBottom: 4, borderBottom: "1px solid #bfdbfe",
                }}>
                  {section.title}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {section.fields.map(field => (
                    <div key={field.key}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
                        marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.04em",
                      }}>
                        {field.label}
                      </div>
                      <div style={{ fontSize: 13 }}>
                        {renderFieldValue(sme[field.key], field.format)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Career assignments list */}
          {assignments.length > 0 && (
            <div style={{ borderTop: "1px solid #bfdbfe", paddingTop: 12 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
              }}>
                Assigned Careers ({assignments.length}/{sme.max_careers ?? 3})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {assignments.map((a, i) => (
                  <span key={i} style={{
                    fontSize: 12, padding: "3px 10px", borderRadius: 4,
                    background: "#fff", border: "1px solid #bfdbfe",
                    color: "var(--text-primary)",
                  }}>
                    {a.career_title ?? a.career_id ?? String(a)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBMISSION DETAIL PANEL — new
────────────────────────────────────────────────────────────────────────── */
function SubDetailPanel({
  sub, smeMap, careerMap,
  subEditStatus, setSubEditStatus,
  subEditNotes,  setSubEditNotes,
  onUpdate, subUpdating,
}) {
  const sme    = smeMap[sub.sme_id];
  const career = careerMap[sub.career_id];

  const submissionData =
    sub.submission_data && typeof sub.submission_data === "object"
      ? sub.submission_data
      : null;

  const microLabel = {
    fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2,
  };

  const sectionLabel = {
    fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.06em",
    marginBottom: 10, paddingBottom: 4, borderBottom: "1px solid #fcd34d",
  };

  return (
    <tr>
      <td colSpan={6} style={{ padding: 0, borderBottom: "2px solid var(--border)" }}>
        <div style={{ background: "#fffbeb", borderTop: "2px solid #fcd34d", padding: "16px 20px" }}>

          {/* ── Meta row ── */}
          <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <div style={microLabel}>SME</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {sme ? sme.full_name : sub.sme_email || "—"}
              </div>
              {sme && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub.sme_email}</div>}
            </div>

            <div>
              <div style={microLabel}>Career</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {career ? (career.title ?? career.name ?? career.id) : (sub.career_id ?? "—")}
              </div>
            </div>

            <div>
              <div style={microLabel}>Status</div>
              <StatusBadge status={sub.status} />
            </div>

            <div>
              <div style={microLabel}>Submitted At</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {sub.submitted_at
                  ? new Date(sub.submitted_at).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })
                  : "—"}
              </div>
            </div>

            {sub.reviewed_at && (
              <div>
                <div style={microLabel}>Reviewed At</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {new Date(sub.reviewed_at).toLocaleString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Existing reviewer notes ── */}
          {sub.reviewer_notes && (
            <div style={{
              marginBottom: 16, padding: "10px 14px",
              background: "#fff", borderRadius: 6, border: "1px solid #fcd34d",
            }}>
              <div style={microLabel}>Reviewer Notes</div>
              <div style={{ fontSize: 13, marginTop: 4, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
                {sub.reviewer_notes}
              </div>
            </div>
          )}

          {/* ── Submission data ── */}
          {submissionData && Object.keys(submissionData).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={sectionLabel}>Submission Data</div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                gap: "10px 20px",
              }}>
                {Object.entries(submissionData).map(([k, v]) => {
                  if (v == null) return null;
                  const display = typeof v === "object"
                    ? JSON.stringify(v, null, 2)
                    : String(v);
                  return (
                    <div key={k}>
                      <div style={microLabel}>{snakeToTitle(k)}</div>
                      <div style={{
                        fontSize: 13, color: "var(--text-primary)",
                        whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        {display}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Status update form ── */}
          <div style={{ borderTop: "1px solid #fcd34d", paddingTop: 14 }}>
            <div style={sectionLabel}>Update Status</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", ...microLabel, marginBottom: 4 }}>New Status</label>
                <select
                  className={INPUT_CLS}
                  value={subEditStatus}
                  onChange={e => setSubEditStatus(e.target.value)}
                  disabled={subUpdating}
                  style={{ minWidth: 160 }}
                >
                  {SUB_STATUS_UPDATE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: 220 }}>
                <label style={{ display: "block", ...microLabel, marginBottom: 4 }}>Reviewer Notes</label>
                <textarea
                  className={INPUT_CLS}
                  rows={2}
                  value={subEditNotes}
                  onChange={e => setSubEditNotes(e.target.value)}
                  disabled={subUpdating}
                  placeholder="Optional notes for the review record…"
                  style={{ resize: "vertical", width: "100%" }}
                />
              </div>

              <Button onClick={() => onUpdate(sub.id)} disabled={subUpdating}>
                {subUpdating ? "Updating…" : "Update Status"}
              </Button>
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
export default function AdminSMEPage() {

  /* ── existing state — SME Registry ── */
  const [smes,      setSmes]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [formError, setFormError] = useState("");

  const [search,       setSearch]       = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "active" | "inactive"

  const [expandedId, setExpandedId] = useState(null);

  const [formMode, setFormMode] = useState(null); // null | "create" | sme object
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);

  const [deactivatingId, setDeactivatingId] = useState(null);
  const [deactivating,   setDeactivating]   = useState(false);

  /* ── new state — tab ── */
  const [activeTab, setActiveTab] = useState("registry"); // "registry" | "submissions"

  /* ── new state — submissions ── */
  const [submissions,     setSubmissions]     = useState([]);
  const [subLoading,      setSubLoading]      = useState(false);
  const [subError,        setSubError]        = useState("");
  const [careers,         setCareers]         = useState([]);
  const [subStatusFilter, setSubStatusFilter] = useState("");
  const [subCareerFilter, setSubCareerFilter] = useState("");
  const [subEmailSearch,  setSubEmailSearch]  = useState("");
  const [expandedSubId,   setExpandedSubId]   = useState(null);
  const [subEditStatus,   setSubEditStatus]   = useState("");
  const [subEditNotes,    setSubEditNotes]    = useState("");
  const [subUpdating,     setSubUpdating]     = useState(false);

  /* ─── load SMEs ─── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet("/v1/admin/sme");
      setSmes(Array.isArray(data) ? data : (data?.smes ?? []));
    } catch (e) {
      setError(e.message || "Failed to load SME profiles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ─── load submissions ─── */
  const loadSubmissions = useCallback(async () => {
    setSubLoading(true);
    setSubError("");
    try {
      const data = await apiGet("/v1/admin/sme/submissions");
      setSubmissions(Array.isArray(data) ? data : (data?.submissions ?? []));
    } catch (e) {
      setSubError(e.message || "Failed to load submissions.");
    } finally {
      setSubLoading(false);
    }
  }, []);

  /* ─── load careers (for filter dropdown) ─── */
  const loadCareers = useCallback(async () => {
    try {
      const data = await apiGet("/v1/careers");
      setCareers(Array.isArray(data) ? data : (data?.careers ?? []));
    } catch {
      // non-fatal — career filter just won't have names
    }
  }, []);

  /* ─── lazily load submissions tab data on first visit ─── */
  useEffect(() => {
    if (activeTab === "submissions") {
      loadSubmissions();
      if (careers.length === 0) loadCareers();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── derived domain options ─── */
  const domainOptions = useMemo(() => {
    const seen = new Set();
    smes.forEach(s => { if (s.expertise_domain) seen.add(s.expertise_domain); });
    return Array.from(seen).sort();
  }, [smes]);

  /* ─── filtered SME list ─── */
  const filtered = useMemo(() => {
    let list = smes;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s =>
        s.full_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }
    if (domainFilter) {
      list = list.filter(s => s.expertise_domain === domainFilter);
    }
    if (activeFilter === "active") {
      list = list.filter(s => s.is_active !== false);
    } else if (activeFilter === "inactive") {
      list = list.filter(s => s.is_active === false);
    }
    return list;
  }, [smes, search, domainFilter, activeFilter]);

  /* ─── filtered submissions list ─── */
  const filteredSubs = useMemo(() => {
    let list = submissions;
    if (subStatusFilter) {
      list = list.filter(s => s.status === subStatusFilter);
    }
    if (subCareerFilter) {
      list = list.filter(s => String(s.career_id) === String(subCareerFilter));
    }
    if (subEmailSearch.trim()) {
      const q = subEmailSearch.trim().toLowerCase();
      list = list.filter(s => s.sme_email?.toLowerCase().includes(q));
    }
    return list;
  }, [submissions, subStatusFilter, subCareerFilter, subEmailSearch]);

  /* ─── pipeline counts (from unfiltered list) ─── */
  const pipelineCounts = useMemo(() => ({
    received:     submissions.filter(s => s.status === "received").length,
    under_review: submissions.filter(s => s.status === "under_review").length,
    approved:     submissions.filter(s => s.status === "approved").length,
    rejected:     submissions.filter(s => s.status === "rejected").length,
  }), [submissions]);

  /* ─── lookup maps for detail panel ─── */
  const smeMap    = useMemo(() => Object.fromEntries(smes.map(s    => [s.id, s])),    [smes]);
  const careerMap = useMemo(() => Object.fromEntries(careers.map(c => [c.id, c])), [careers]);

  /* ─── subtitle ─── */
  const subtitleText = () => {
    if (activeTab === "submissions") {
      if (subLoading) return "Loading…";
      const n = filteredSubs.length;
      const label = subStatusFilter ? STATUS_META[subStatusFilter]?.label : null;
      return label
        ? `${n} ${label.toLowerCase()} submission${n !== 1 ? "s" : ""}`
        : `${n} submission${n !== 1 ? "s" : ""}`;
    }
    if (loading) return "Loading…";
    const n = filtered.length;
    if (activeFilter === "active" && domainFilter) return `${n} active ${domainFilter} expert${n !== 1 ? "s" : ""}`;
    if (activeFilter === "active") return `${n} active expert${n !== 1 ? "s" : ""}`;
    if (domainFilter) return `${n} ${domainFilter} expert${n !== 1 ? "s" : ""}`;
    return `${n} SME profile${n !== 1 ? "s" : ""}`;
  };

  /* ─── form helpers ─── */
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setFormMode("create");
    setExpandedId(null);
  };

  const openEdit = (sme) => {
    const f = {};
    FORM_FIELDS.forEach(({ key }) => {
      f[key] = sme[key] != null ? String(sme[key]) : "";
    });
    setForm(f);
    setFormError("");
    setFormMode(sme);
    setExpandedId(null);
  };

  const closeForm = () => {
    setFormMode(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const buildBody = () => {
    const body = {};
    FORM_FIELDS.forEach(({ key, type }) => {
      const raw = form[key];
      if (type === "number") {
        body[key] = raw !== "" ? Number(raw) : null;
      } else {
        body[key] = raw.trim() !== "" ? raw.trim() : null;
      }
    });
    return body;
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { setFormError("Full name is required."); return; }
    if (!form.email.trim())     { setFormError("Email is required.");     return; }
    setSaving(true);
    setFormError("");
    try {
      if (formMode === "create") {
        await apiPost("/v1/admin/sme", buildBody());
      } else {
        await apiPut(`/v1/admin/sme/${formMode.id}`, buildBody());
      }
      closeForm();
      await loadAll();
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
      await apiDelete(`/v1/admin/sme/${deactivatingId}`);
      setDeactivatingId(null);
      await loadAll();
    } catch (e) {
      setError(e.message || "Deactivate failed.");
      setDeactivatingId(null);
    } finally {
      setDeactivating(false);
    }
  };

  /* ─── submission expand / collapse ─── */
  const handleSubExpand = (sub) => {
    if (expandedSubId === sub.id) {
      setExpandedSubId(null);
    } else {
      setExpandedSubId(sub.id);
      setSubEditStatus(sub.status || "received");
      setSubEditNotes(sub.reviewer_notes || "");
    }
  };

  /* ─── submission status update ─── */
  const handleSubStatusUpdate = async (submissionId) => {
    setSubUpdating(true);
    setSubError("");
    try {
      await apiPut(`/v1/admin/sme/submissions/${submissionId}/status`, {
        status: subEditStatus,
        notes:  subEditNotes,
      });
      await loadSubmissions();
    } catch (e) {
      setSubError(e.message || "Status update failed.");
    } finally {
      setSubUpdating(false);
    }
  };

  /* ─── shared styles (component-scoped) ─── */
  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 600,
    marginBottom: 4, color: "var(--text-primary)",
  };

  /* ─── form field renderer ─── */
  const renderFormField = (field) => {
    const { key, label, type, required, placeholder, options } = field;
    const value    = form[key];
    const onChange = e => setForm(f => ({ ...f, [key]: e.target.value }));

    let input;
    if (type === "textarea") {
      input = (
        <textarea className={INPUT_CLS} rows={2} value={value}
          onChange={onChange} placeholder={placeholder}
          style={{ resize: "vertical", width: "100%" }} />
      );
    } else if (type === "select") {
      input = (
        <select className={INPUT_CLS} value={value} onChange={onChange} style={{ width: "100%" }}>
          {(options || []).map(o => (
            <option key={o} value={o}>{o || "— Not set —"}</option>
          ))}
        </select>
      );
    } else {
      input = (
        <input type={type} className={INPUT_CLS} value={value}
          onChange={onChange} placeholder={placeholder} style={{ width: "100%" }} />
      );
    }

    return (
      <div key={key} style={{ gridColumn: `span ${field.gridSpan}` }}>
        <label style={labelStyle}>
          {label}{required && <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>}
        </label>
        {input}
      </div>
    );
  };

  const isEditing = formMode && formMode !== "create";

  /* ─── active filter toggle button ─── */
  const toggleBtn = (value, label) => {
    const isActive = activeFilter === value;
    return (
      <button
        onClick={() => { setActiveFilter(value); setExpandedId(null); }}
        style={{
          padding: "6px 12px", fontSize: 13, fontWeight: isActive ? 700 : 500,
          borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer",
          background: isActive ? "var(--brand-primary)" : "#fff",
          color: isActive ? "#fff" : "var(--text-muted)",
          transition: "all 0.1s",
          fontFamily: "inherit",
        }}
      >
        {label}
      </button>
    );
  };

  /* ─── tab button style ─── */
  const tabStyle = (active) => ({
    padding: "8px 20px", fontSize: 14, fontWeight: active ? 700 : 500,
    border: "none", background: "transparent", cursor: "pointer",
    color: active ? "var(--brand-primary)" : "var(--text-muted)",
    borderBottom: active ? "2px solid var(--brand-primary)" : "2px solid transparent",
    marginBottom: -2, transition: "all 0.15s",
    fontFamily: "inherit",
  });

  /* ─── render ─── */
  return (
    <SkeletonPage
      title="SME Management"
      subtitle={subtitleText()}
      loading={loading}
      error={!loading ? error : ""}
      onRetry={loadAll}
      actions={
        !loading && !error && activeTab === "registry" && (
          <Button onClick={openCreate} disabled={formMode !== null}>+ New SME</Button>
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

      {/* ══════════════════════════════════════════════════════════
          TAB NAVIGATION
          ══════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: 20 }}>
        <button style={tabStyle(activeTab === "registry")} onClick={() => setActiveTab("registry")}>
          SME Registry
        </button>
        <button style={tabStyle(activeTab === "submissions")} onClick={() => setActiveTab("submissions")}>
          Submissions
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          REGISTRY TAB
          ══════════════════════════════════════════════════════════ */}
      {activeTab === "registry" && (
        <>
          {/* ── Create / Edit form ── */}
          {formMode !== null && (
            <Card className="mb-6">
              <h2 style={{ margin: "0 0 16px", fontSize: "var(--font-size-lg)", fontWeight: 700 }}>
                {isEditing ? `Edit — ${formMode.full_name}` : "Create SME Profile"}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                {FORM_FIELDS.map(renderFormField)}
              </div>
              {formError && (
                <p style={{ margin: "0 0 12px", fontSize: 13, color: "#dc2626" }}>{formError}</p>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : isEditing ? "Save changes" : "Create SME"}
                </Button>
                <Button variant="secondary" onClick={closeForm} disabled={saving}>Cancel</Button>
              </div>
            </Card>
          )}

          {/* ── Deactivate confirmation ── */}
          {deactivatingId !== null && (
            <Card className="mb-6">
              <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-primary)" }}>
                Deactivate <strong>{smes.find(s => s.id === deactivatingId)?.full_name}</strong>?
                They will be marked inactive and will not appear as available for new assignments.
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

          {/* ── Filters ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className={INPUT_CLS}
              style={{ maxWidth: 260 }}
              placeholder="Search by name or email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setExpandedId(null); }}
            />
            <select
              className={INPUT_CLS}
              style={{ maxWidth: 200 }}
              value={domainFilter}
              onChange={e => { setDomainFilter(e.target.value); setExpandedId(null); }}
            >
              <option value="">All Domains</option>
              {domainOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <div style={{ display: "flex", gap: 4 }}>
              {toggleBtn("all",      "All")}
              {toggleBtn("active",   "Active")}
              {toggleBtn("inactive", "Inactive")}
            </div>
            {(search || domainFilter || activeFilter !== "all") && (
              <Button size="sm" variant="ghost"
                onClick={() => { setSearch(""); setDomainFilter(""); setActiveFilter("all"); setExpandedId(null); }}>
                Clear filters
              </Button>
            )}
          </div>

          {/* ── Table ── */}
          {filtered.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
              No SME profiles match the current filters.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                    {["Name", "Email", "Organization", "Domain", "Experience", "Careers", "Active", "Actions"].map(h => (
                      <th key={h} style={{
                        padding: "8px 10px", fontWeight: 700,
                        color: "var(--text-muted)", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sme, idx) => {
                    const isInactive    = sme.is_active === false;
                    const assignedCount = Array.isArray(sme.career_assignments) ? sme.career_assignments.length : 0;
                    const maxCareers    = sme.max_careers ?? 3;
                    const atCapacity    = assignedCount >= maxCareers;
                    const isExpanded    = expandedId === sme.id;

                    return (
                      <Fragment key={sme.id}>
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
                          <td style={{ padding: "9px 10px", fontWeight: 600, maxWidth: 180 }}>
                            <span
                              onClick={() => setExpandedId(isExpanded ? null : sme.id)}
                              style={{
                                color: "#0d9488", cursor: "pointer",
                                textDecoration: isExpanded ? "underline" : "none",
                                whiteSpace: "nowrap",
                              }}
                              title="Click to expand details"
                            >
                              {sme.full_name}
                            </span>
                            {isExpanded && <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>▲</span>}
                          </td>

                          {/* Email */}
                          <td style={{ padding: "9px 10px", color: "var(--text-muted)", maxWidth: 200 }}>
                            {sme.email || "—"}
                          </td>

                          {/* Organization */}
                          <td style={{
                            padding: "9px 10px", color: "var(--text-muted)",
                            maxWidth: 160, whiteSpace: "nowrap",
                            overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {sme.organization || "—"}
                          </td>

                          {/* Domain */}
                          <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                            {sme.expertise_domain
                              ? <span style={{
                                  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                                  background: "#dbeafe", color: "#1e40af",
                                }}>{sme.expertise_domain}</span>
                              : <span style={{ color: "var(--text-muted)" }}>—</span>
                            }
                          </td>

                          {/* Years experience */}
                          <td style={{ padding: "9px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                            {sme.years_experience != null ? `${sme.years_experience} yrs` : "—"}
                          </td>

                          {/* Careers assigned */}
                          <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                            <span style={{
                              fontWeight: 600,
                              color: atCapacity ? "#dc2626" : assignedCount > 0 ? "#d97706" : "var(--text-muted)",
                            }}>
                              {assignedCount}/{maxCareers}
                            </span>
                          </td>

                          {/* Active badge */}
                          <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                            {isInactive
                              ? <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#fee2e2", color: "#991b1b" }}>Inactive</span>
                              : <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#dcfce7", color: "#166534" }}>Active</span>
                            }
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "9px 10px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <Button size="sm" variant="secondary"
                                onClick={() => openEdit(sme)}
                                disabled={formMode !== null || deactivatingId !== null}>
                                Edit
                              </Button>
                              {!isInactive && (
                                <Button size="sm" variant="danger"
                                  onClick={() => setDeactivatingId(sme.id)}
                                  disabled={formMode !== null || deactivatingId !== null}>
                                  Deactivate
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Detail panel (only when expanded) */}
                        {isExpanded && <DetailPanel sme={sme} onEdit={openEdit} />}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          SUBMISSIONS TAB
          ══════════════════════════════════════════════════════════ */}
      {activeTab === "submissions" && (
        <>
          {/* Error banner */}
          {subError && (
            <p style={{ color: "#dc2626", marginBottom: 12, fontSize: 13 }}>{subError}</p>
          )}

          {/* ── Pipeline summary cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { key: "received",     ...STATUS_META.received },
              { key: "under_review", ...STATUS_META.under_review },
              { key: "approved",     ...STATUS_META.approved },
              { key: "rejected",     ...STATUS_META.rejected },
            ].map(({ key, label, bg, color }) => (
              <div key={key} style={{
                background: bg, borderRadius: 8, padding: "14px 16px",
                border: `1px solid ${color}33`,
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>
                  {pipelineCounts[key]}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* ── Filters row ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <select
              className={INPUT_CLS}
              style={{ maxWidth: 180 }}
              value={subStatusFilter}
              onChange={e => { setSubStatusFilter(e.target.value); setExpandedSubId(null); }}
            >
              {SUB_STATUS_FILTER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              className={INPUT_CLS}
              style={{ maxWidth: 220 }}
              value={subCareerFilter}
              onChange={e => { setSubCareerFilter(e.target.value); setExpandedSubId(null); }}
            >
              <option value="">All Careers</option>
              {careers.map(c => (
                <option key={c.id} value={String(c.id)}>
                  {c.title ?? c.name ?? String(c.id)}
                </option>
              ))}
            </select>

            <input
              className={INPUT_CLS}
              style={{ maxWidth: 240 }}
              placeholder="Search by SME email…"
              value={subEmailSearch}
              onChange={e => { setSubEmailSearch(e.target.value); setExpandedSubId(null); }}
            />

            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {subLoading
                ? "Loading…"
                : `${filteredSubs.length} submission${filteredSubs.length !== 1 ? "s" : ""}${subStatusFilter ? ` · ${STATUS_META[subStatusFilter]?.label ?? subStatusFilter}` : ""}`
              }
            </span>

            {(subStatusFilter || subCareerFilter || subEmailSearch) && (
              <Button size="sm" variant="ghost" onClick={() => {
                setSubStatusFilter(""); setSubCareerFilter(""); setSubEmailSearch(""); setExpandedSubId(null);
              }}>
                Clear filters
              </Button>
            )}

            <Button size="sm" variant="secondary" onClick={loadSubmissions} disabled={subLoading}>
              {subLoading ? "Loading…" : "Refresh"}
            </Button>
          </div>

          {/* ── Submissions table ── */}
          {subLoading ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
              Loading submissions…
            </p>
          ) : filteredSubs.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
              No submissions match the current filters.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                    {["ID", "SME Email", "Career", "Status", "Submitted At", "Actions"].map(h => (
                      <th key={h} style={{
                        padding: "8px 10px", fontWeight: 700,
                        color: "var(--text-muted)", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSubs.map((sub, idx) => {
                    const isExpanded = expandedSubId === sub.id;
                    const career     = careerMap[sub.career_id];

                    return (
                      <Fragment key={sub.id}>
                        <tr
                          onClick={() => handleSubExpand(sub)}
                          style={{
                            borderBottom: isExpanded ? "none" : "1px solid var(--border)",
                            background: isExpanded
                              ? "#fef9c3"
                              : idx % 2 === 0 ? "transparent" : "var(--bg-app)",
                            cursor: "pointer",
                          }}
                        >
                          {/* ID */}
                          <td style={{ padding: "9px 10px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                            #{sub.id}
                          </td>

                          {/* SME Email */}
                          <td style={{ padding: "9px 10px", maxWidth: 220 }}>
                            <span style={{ color: "#0d9488", fontWeight: 600 }}>
                              {sub.sme_email || "—"}
                            </span>
                            {isExpanded && <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>▲</span>}
                          </td>

                          {/* Career */}
                          <td style={{ padding: "9px 10px", color: "var(--text-muted)" }}>
                            {career ? (career.title ?? career.name ?? career.id) : (sub.career_id ?? "—")}
                          </td>

                          {/* Status */}
                          <td style={{ padding: "9px 10px" }}>
                            <StatusBadge status={sub.status} />
                          </td>

                          {/* Submitted At */}
                          <td style={{ padding: "9px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                            {relativeTime(sub.submitted_at)}
                          </td>

                          {/* Actions — stop propagation so row click doesn't double-fire */}
                          <td style={{ padding: "9px 10px" }} onClick={e => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant={isExpanded ? "secondary" : "primary"}
                              onClick={() => handleSubExpand(sub)}
                            >
                              {isExpanded ? "Collapse" : "Review"}
                            </Button>
                          </td>
                        </tr>

                        {/* Submission detail panel */}
                        {isExpanded && (
                          <SubDetailPanel
                            sub={sub}
                            smeMap={smeMap}
                            careerMap={careerMap}
                            subEditStatus={subEditStatus}
                            setSubEditStatus={setSubEditStatus}
                            subEditNotes={subEditNotes}
                            setSubEditNotes={setSubEditNotes}
                            onUpdate={handleSubStatusUpdate}
                            subUpdating={subUpdating}
                          />
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

    </SkeletonPage>
  );
}
