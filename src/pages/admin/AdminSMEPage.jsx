// src/pages/admin/AdminSMEPage.jsx
import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import { apiGet, apiPost, apiPut, apiDelete } from "../../apiClient";

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────────────────────── */
const DOMAIN_OPTIONS = [
  "STEM", "Business", "Healthcare", "Education",
  "Arts", "Law", "Finance", "Government", "Other",
];

/* ─────────────────────────────────────────────────────────────────────────
   DETAIL PANEL CONFIG
────────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────
   FORM FIELDS CONFIG
────────────────────────────────────────────────────────────────────────── */
const FORM_FIELDS = [
  { key: "full_name",        label: "Full Name",        type: "text",     required: true,  placeholder: "e.g. Dr. Priya Sharma",         gridSpan: 2 },
  { key: "email",            label: "Email",            type: "text",     required: true,  placeholder: "e.g. priya@example.com",        gridSpan: 1 },
  { key: "phone",            label: "Phone",            type: "text",     required: false, placeholder: "e.g. +91 98765 43210",          gridSpan: 1 },
  { key: "organization",     label: "Organization",     type: "text",     required: false, placeholder: "e.g. IIT Bombay",               gridSpan: 2 },
  { key: "designation",      label: "Designation",      type: "text",     required: false, placeholder: "e.g. Professor",                gridSpan: 2 },
  { key: "expertise_domain", label: "Expertise Domain", type: "select",   required: false, options: ["", ...DOMAIN_OPTIONS],             gridSpan: 1 },
  { key: "years_experience", label: "Years Experience", type: "number",   required: false, placeholder: "e.g. 12",                       gridSpan: 1 },
  { key: "max_careers",      label: "Max Careers",      type: "number",   required: false, placeholder: "e.g. 3",                        gridSpan: 1 },
  { key: "notes",            label: "Notes",            type: "textarea", required: false, placeholder: "Internal notes about this SME…", gridSpan: 3 },
];

const EMPTY_FORM = Object.fromEntries(
  FORM_FIELDS.map(f => [f.key, f.key === "max_careers" ? "3" : ""])
);

/* ─────────────────────────────────────────────────────────────────────────
   FIELD VALUE RENDERER
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
   DETAIL PANEL
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
   PAGE
────────────────────────────────────────────────────────────────────────── */
export default function AdminSMEPage() {
  const [smes,      setSmes]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [formError, setFormError] = useState("");

  // filters
  const [search,       setSearch]       = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "active" | "inactive"

  // expand
  const [expandedId, setExpandedId] = useState(null);

  // form: null = closed | "create" | sme object (editing)
  const [formMode, setFormMode] = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);

  // deactivate confirmation
  const [deactivatingId, setDeactivatingId] = useState(null);
  const [deactivating,   setDeactivating]   = useState(false);

  /* ─── load ─── */

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

  /* ─── derived domain options from live data ─── */

  const domainOptions = useMemo(() => {
    const seen = new Set();
    smes.forEach(s => { if (s.expertise_domain) seen.add(s.expertise_domain); });
    return Array.from(seen).sort();
  }, [smes]);

  /* ─── filtered list ─── */

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

  const subtitleText = () => {
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

  /* ─── shared styles ─── */

  const inputCls = [
    "rounded-md border border-[var(--border)] bg-white px-3 py-2",
    "text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1",
  ].join(" ");

  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 600,
    marginBottom: 4, color: "var(--text-primary)",
  };

  /* ─── form field renderer (driven by FORM_FIELDS config) ─── */

  const renderFormField = (field) => {
    const { key, label, type, required, placeholder, options } = field;
    const value = form[key];
    const onChange = e => setForm(f => ({ ...f, [key]: e.target.value }));

    let input;
    if (type === "textarea") {
      input = (
        <textarea className={inputCls} rows={2} value={value}
          onChange={onChange} placeholder={placeholder}
          style={{ resize: "vertical", width: "100%" }} />
      );
    } else if (type === "select") {
      input = (
        <select className={inputCls} value={value} onChange={onChange} style={{ width: "100%" }}>
          {(options || []).map(o => (
            <option key={o} value={o}>{o || "— Not set —"}</option>
          ))}
        </select>
      );
    } else {
      input = (
        <input type={type} className={inputCls} value={value}
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

  /* ─── render ─── */

  return (
    <SkeletonPage
      title="SME Registry"
      subtitle={subtitleText()}
      loading={loading}
      error={!loading ? error : ""}
      onRetry={loadAll}
      actions={
        !loading && !error && (
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
          className={inputCls}
          style={{ maxWidth: 260 }}
          placeholder="Search by name or email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setExpandedId(null); }}
        />
        <select
          className={inputCls}
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

                    {/* ── Detail panel (only when expanded) ── */}
                    {isExpanded && <DetailPanel sme={sme} onEdit={openEdit} />}
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
