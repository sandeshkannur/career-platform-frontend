// src/pages/admin/AdminCareersPage.jsx
import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import { apiGet, apiPost, apiPut, apiDelete } from "../../apiClient";

const PAGE_SIZE = 50;

/* ─────────────────────────────────────────────────────────────────────────
   DETAIL PANEL CONFIG
   To add a new read-only field to the detail panel: add one entry below.
   format options: "inr" | "badge" | undefined (plain text)
   fullWidth: renders the field spanning all columns in its section
────────────────────────────────────────────────────────────────────────── */
const DETAIL_SECTIONS = [
  { title: "Identity", fields: [
    { key: "indian_job_title",   label: "Indian Job Title" },
    { key: "prestige_title",     label: "Prestige Title" },
    { key: "description",        label: "Description", fullWidth: true },
    { key: "domain_category",    label: "Domain Category" },
  ]},
  { title: "Salary & Market", fields: [
    { key: "salary_entry_inr",   label: "Salary Entry",    format: "inr" },
    { key: "salary_mid_inr",     label: "Salary Mid",      format: "inr" },
    { key: "salary_peak_inr",    label: "Salary Peak",     format: "inr" },
    { key: "automation_risk",    label: "Automation Risk", format: "badge" },
    { key: "future_outlook",     label: "Future Outlook",  format: "badge" },
  ]},
  { title: "Career Pathways", fields: [
    { key: "pathway_step1",      label: "Step 1" },
    { key: "pathway_step2",      label: "Step 2" },
    { key: "pathway_step3",      label: "Step 3" },
    { key: "pathway_accessible", label: "Accessible Route" },
    { key: "pathway_premium",    label: "Premium Route" },
    { key: "pathway_earn_learn", label: "Earn & Learn" },
  ]},
];

/* ─────────────────────────────────────────────────────────────────────────
   FORM FIELDS CONFIG
   To add a new editable field to the create/edit form: add one entry below.
   type: "text" | "textarea" | "number" | "select"
   options: array of strings, or "CLUSTERS" (resolved at render time)
   gridSpan: 1 | 2 | 3  (out of a 3-column grid)
   transform: optional fn applied on change (e.g. toUpperCase)
────────────────────────────────────────────────────────────────────────── */
const FORM_FIELDS = [
  { key: "title",              label: "Title",              type: "text",     required: true,  placeholder: "e.g. Agricultural Scientist",  gridSpan: 2 },
  { key: "career_code",        label: "Career Code",        type: "text",     required: true,  placeholder: "e.g. AGR_030",                 gridSpan: 1, transform: v => v.toUpperCase() },
  { key: "cluster_id",         label: "Cluster",            type: "select",   required: false, options: "CLUSTERS",                         gridSpan: 1 },
  { key: "recommended_stream", label: "Recommended Stream", type: "select",   required: false, options: ["", "Science PCM", "Science PCB", "Commerce", "Arts/Humanities", "Any"], gridSpan: 1 },
  { key: "domain_category",    label: "Domain Category",    type: "text",     required: false, placeholder: "e.g. Technology",              gridSpan: 1 },
  { key: "description",        label: "Description",        type: "textarea", required: false, placeholder: "Brief description (optional)", gridSpan: 3 },
  { key: "indian_job_title",   label: "Indian Job Title",   type: "text",     required: false, placeholder: "e.g. Software Engineer",       gridSpan: 1 },
  { key: "prestige_title",     label: "Prestige Title",     type: "text",     required: false, placeholder: "e.g. AI Researcher",           gridSpan: 2 },
  { key: "salary_entry_inr",   label: "Salary Entry (₹)",  type: "number",   required: false, placeholder: "e.g. 400000",                  gridSpan: 1 },
  { key: "salary_mid_inr",     label: "Salary Mid (₹)",    type: "number",   required: false, placeholder: "e.g. 800000",                  gridSpan: 1 },
  { key: "salary_peak_inr",    label: "Salary Peak (₹)",   type: "number",   required: false, placeholder: "e.g. 2000000",                 gridSpan: 1 },
  { key: "automation_risk",    label: "Automation Risk",    type: "select",   required: false, options: ["", "low", "medium", "high"],      gridSpan: 1 },
  { key: "future_outlook",     label: "Future Outlook",     type: "select",   required: false, options: ["", "growing", "stable", "declining"], gridSpan: 1 },
  { key: "pathway_step1",      label: "Pathway Step 1",     type: "text",     required: false, placeholder: "e.g. Complete B.Tech CS",      gridSpan: 3 },
  { key: "pathway_step2",      label: "Pathway Step 2",     type: "text",     required: false, placeholder: "e.g. Gain internship experience", gridSpan: 3 },
  { key: "pathway_step3",      label: "Pathway Step 3",     type: "text",     required: false, placeholder: "e.g. Join as junior engineer", gridSpan: 3 },
  { key: "pathway_accessible", label: "Accessible Route",   type: "textarea", required: false, placeholder: "Low-barrier entry path…",      gridSpan: 3 },
  { key: "pathway_premium",    label: "Premium Route",      type: "textarea", required: false, placeholder: "Competitive / elite path…",    gridSpan: 3 },
  { key: "pathway_earn_learn", label: "Earn & Learn",       type: "textarea", required: false, placeholder: "Work while studying path…",    gridSpan: 3 },
];

const EMPTY_FORM = Object.fromEntries(FORM_FIELDS.map(f => [f.key, ""]));

/* ─────────────────────────────────────────────────────────────────────────
   FIELD VALUE RENDERER
   Used by the detail panel. Controls how each field's value is displayed.
────────────────────────────────────────────────────────────────────────── */
function renderFieldValue(value, format) {
  if (value == null || value === "") {
    return <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>;
  }
  if (format === "inr") {
    const n = parseFloat(value);
    if (!n) return <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>;
    return <span style={{ fontWeight: 600 }}>₹{(n / 100000).toFixed(1)}L</span>;
  }
  if (format === "badge") {
    const v = String(value).toLowerCase();
    const isRed    = v === "high" || v === "declining";
    const isYellow = v === "medium" || v === "stable";
    const isGreen  = v === "low"  || v === "growing";
    const bg    = isRed ? "#fee2e2" : isYellow ? "#fef9c3" : isGreen ? "#dcfce7" : "#f1f5f9";
    const color = isRed ? "#991b1b" : isYellow ? "#854d0e" : isGreen ? "#166534" : "var(--text-muted)";
    return (
      <span style={{
        display: "inline-block", fontSize: 11, fontWeight: 600,
        padding: "2px 8px", borderRadius: 4, background: bg, color,
      }}>
        {value}
      </span>
    );
  }
  return <span style={{ lineHeight: 1.5 }}>{String(value)}</span>;
}

/* ─────────────────────────────────────────────────────────────────────────
   DETAIL PANEL
   Renders DETAIL_SECTIONS config as a 3-column card panel.
────────────────────────────────────────────────────────────────────────── */
function DetailPanel({ career, onEdit }) {
  return (
    <tr>
      <td colSpan={9} style={{
        padding: 0,
        borderBottom: "2px solid var(--border)",
      }}>
        <div style={{
          background: "#f0f7ff",
          borderTop: "2px solid #bfdbfe",
          padding: "16px 20px",
        }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              {career.title}
              {career.career_code && (
                <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
                  {career.career_code}
                </span>
              )}
            </span>
            <Button size="sm" onClick={() => onEdit(career)}>Edit this career</Button>
          </div>

          {/* Three-column sections */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
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
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {field.label}
                      </div>
                      <div style={{ fontSize: 13 }}>
                        {renderFieldValue(career[field.key], field.format)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SIMILARITY BAR — fills proportionally to score (0–1)
────────────────────────────────────────────────────────────────────────── */
function SimBar({ score, color }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: "#e2e8f0", overflow: "hidden", marginBottom: 2 }}>
      <div style={{
        height: "100%", borderRadius: 3,
        width: `${Math.min(100, Math.round(score * 100))}%`,
        background: color, transition: "width 0.3s",
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PROXIMITY PANEL — neighbour cards rendered as a table row
────────────────────────────────────────────────────────────────────────── */
function ProximityPanel({ entry, clusterName }) {
  const { loading, error, data } = entry;

  const neighbours = data
    ? (Array.isArray(data) ? data : (data.neighbours ?? data.neighbors ?? []))
    : [];

  return (
    <tr>
      <td colSpan={9} style={{ padding: 0, borderBottom: "2px solid var(--border)" }}>
        <div style={{ background: "#faf5ff", borderTop: "2px solid #d8b4fe", padding: "16px 20px" }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "#7c3aed",
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14,
          }}>
            Proximity Analysis — Nearest Neighbours
          </div>

          {loading && (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading proximity data…</p>
          )}
          {error && (
            <p style={{ color: "#dc2626", fontSize: 13 }}>⚠ {error}</p>
          )}
          {!loading && !error && neighbours.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No neighbour data returned.</p>
          )}

          {!loading && !error && neighbours.length > 0 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
              gap: 12,
            }}>
              {neighbours.slice(0, 5).map((nb, i) => {
                const composite   = nb.composite ?? nb.similarity ?? nb.score ?? 0;
                const pct         = Math.round(composite * 100);
                const isDupe      = composite > 0.92;
                const barClr      = composite > 0.9 ? "#7c3aed" : composite > 0.7 ? "#d97706" : "#94a3b8";
                const scoreClr    = composite > 0.9 ? "#7c3aed" : composite > 0.7 ? "#d97706" : "var(--text-muted)";
                const dims        = nb.dimensions ?? nb.dimension_scores ?? nb.scores ?? {};
                const sharedSkills = Array.isArray(nb.shared_key_skills ?? nb.shared_skills)
                  ? (nb.shared_key_skills ?? nb.shared_skills) : [];
                const uniqueSrc   = Array.isArray(nb.unique_to_source)   ? nb.unique_to_source   : [];
                const uniqueNb    = Array.isArray(nb.unique_to_neighbour ?? nb.unique_skills)
                  ? (nb.unique_to_neighbour ?? nb.unique_skills) : [];
                const allUnique   = [...uniqueSrc, ...uniqueNb];

                return (
                  <div key={nb.career_id ?? i} style={{
                    background: "#fff", borderRadius: 8, padding: "12px 14px",
                    border: `1px solid ${isDupe ? "#fca5a5" : "#ede9fe"}`,
                    borderTop: `3px solid ${isDupe ? "#ef4444" : "#7c3aed"}`,
                  }}>
                    {/* Rank + duplicate badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: "#7c3aed",
                        background: "#ede9fe", padding: "1px 6px", borderRadius: 3,
                      }}>
                        #{i + 1}
                      </span>
                      {isDupe && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          background: "#fee2e2", color: "#991b1b",
                          padding: "2px 6px", borderRadius: 3,
                        }}>
                          ⚠ Duplicate Risk
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2, lineHeight: 1.3 }}>
                      {nb.title ?? `Career #${nb.career_id}`}
                    </div>

                    {/* Cluster */}
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
                      {nb.cluster_name ?? clusterName(nb.cluster_id) ?? "—"}
                    </div>

                    {/* Composite score + bar */}
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Composite Similarity
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: scoreClr }}>{pct}%</span>
                      </div>
                      <SimBar score={composite} color={barClr} />
                    </div>

                    {/* Per-dimension scores */}
                    {Object.keys(dims).length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>
                        {Object.entries(dims).map(([dim, val]) => (
                          <span key={dim} style={{
                            fontSize: 9, fontWeight: 600, padding: "2px 5px", borderRadius: 3,
                            background: "#f1f5f9", color: "var(--text-muted)", textTransform: "capitalize",
                          }}>
                            {dim.replace(/_/g, " ")}: {typeof val === "number" ? `${Math.round(val * 100)}%` : String(val)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Shared key skills — green */}
                    {sharedSkills.length > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#166534", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Shared Skills
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {sharedSkills.map((s, j) => (
                            <span key={j} style={{
                              fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3,
                              background: "#dcfce7", color: "#166534",
                            }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unique key skills — amber */}
                    {allUnique.length > 0 && (
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#92400e", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Unique Skills
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {allUnique.map((s, j) => (
                            <span key={j} style={{
                              fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3,
                              background: "#fef3c7", color: "#92400e",
                            }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
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
   HELPERS
────────────────────────────────────────────────────────────────────────── */
function trunc(str, n = 60) {
  if (!str) return "—";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function inrLakh(val) {
  const n = parseFloat(val);
  if (!n) return "—";
  return `₹${(n / 100000).toFixed(1)}L`;
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE COMPONENT
────────────────────────────────────────────────────────────────────────── */
export default function AdminCareersPage() {
  const [careers,  setCareers]  = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [formError, setFormError] = useState("");

  // filters (client-side)
  const [search,        setSearch]        = useState("");
  const [clusterFilter, setClusterFilter] = useState("");
  const [showAll,       setShowAll]       = useState(false);

  // expand
  const [expandedId, setExpandedId] = useState(null);

  // form: null = closed | "create" | career object (editing)
  const [formMode, setFormMode] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);

  // delete confirmation
  const [deletingId, setDeletingId] = useState(null);
  const [deleting,   setDeleting]   = useState(false);

  // proximity
  const [proximityId,  setProximityId]  = useState(null);
  const [proximityMap, setProximityMap] = useState({}); // {[career_id]: {loading, error, data}}

  // recompute vectors
  const [recomputeLoading,  setRecomputeLoading]  = useState(false);
  const [recomputeMsg,      setRecomputeMsg]      = useState("");
  const [recomputeIsError,  setRecomputeIsError]  = useState(false);
  const [vectorsComputedAt, setVectorsComputedAt] = useState(null);

  /* ─── load ─── */

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [careersData, clustersData] = await Promise.all([
        apiGet("/v1/careers"),
        apiGet("/v1/career-clusters"),
      ]);
      setCareers( Array.isArray(careersData)  ? careersData  : (careersData?.careers   ?? []));
      setClusters(Array.isArray(clustersData) ? clustersData : (clustersData?.clusters ?? []));
    } catch (e) {
      setError(e.message || "Failed to load careers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ─── filtered + paginated view ─── */

  const filtered = useMemo(() => {
    let list = careers;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c => c.title?.toLowerCase().includes(q) || c.career_code?.toLowerCase().includes(q));
    }
    if (clusterFilter) {
      list = list.filter(c => String(c.cluster_id) === clusterFilter);
    }
    return list;
  }, [careers, search, clusterFilter]);

  const displayed = showAll ? filtered : filtered.slice(0, PAGE_SIZE);

  const clusterName = (id) => clusters.find(c => String(c.id) === String(id))?.name ?? "—";

  const subtitleText = () => {
    if (loading) return "Loading…";
    const total  = filtered.length;
    const clName = clusterFilter ? clusters.find(c => String(c.id) === clusterFilter)?.name : null;
    return clName
      ? `${total} career${total !== 1 ? "s" : ""} in ${clName}`
      : `${total} career${total !== 1 ? "s" : ""}`;
  };

  /* ─── form helpers ─── */

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setFormMode("create");
    setExpandedId(null);
  };

  const openEdit = (career) => {
    const f = {};
    FORM_FIELDS.forEach(({ key }) => {
      f[key] = career[key] != null ? String(career[key]) : "";
    });
    setForm(f);
    setFormError("");
    setFormMode(career);
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
    // career_code always uppercase
    if (body.career_code) body.career_code = body.career_code.toUpperCase();
    // cluster_id as integer
    if (body.cluster_id) body.cluster_id = Number(body.cluster_id);
    return body;
  };

  const handleSave = async () => {
    if (!form.title.trim())       { setFormError("Title is required.");       return; }
    if (!form.career_code.trim()) { setFormError("Career code is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      if (formMode === "create") {
        await apiPost("/v1/careers", buildBody());
      } else {
        await apiPut(`/v1/careers/${formMode.id}`, buildBody());
      }
      closeForm();
      await loadAll();
    } catch (e) {
      setFormError(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ─── delete ─── */

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await apiDelete(`/v1/careers/${deletingId}`);
      setDeletingId(null);
      await loadAll();
    } catch (e) {
      setError(e.message || "Delete failed.");
      setDeletingId(null);
    } finally {
      setDeleting(false);
    }
  };

  /* ─── proximity ─── */

  const handleProximity = async (career) => {
    // Toggle off if already open
    if (proximityId === career.id) {
      setProximityId(null);
      return;
    }
    setProximityId(career.id);

    // Already fetched — reuse cached result
    if (proximityMap[career.id]?.data || proximityMap[career.id]?.error) return;

    setProximityMap(prev => ({ ...prev, [career.id]: { loading: true, error: "", data: null } }));
    try {
      const data = await apiGet(`/v1/admin/careers/${career.id}/proximity`);
      setProximityMap(prev => ({ ...prev, [career.id]: { loading: false, error: "", data } }));
    } catch (e) {
      setProximityMap(prev => ({
        ...prev,
        [career.id]: { loading: false, error: e.message || "Failed to load proximity.", data: null },
      }));
    }
  };

  /* ─── recompute vectors ─── */

  const handleRecompute = async () => {
    setRecomputeLoading(true);
    setRecomputeMsg("");
    setRecomputeIsError(false);
    try {
      await apiPost("/v1/admin/careers/recompute-vectors");
      const now = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      });
      setVectorsComputedAt(now);
      setRecomputeMsg("Vectors recomputed successfully.");
      setProximityMap({}); // Invalidate cached proximity results
      setProximityId(null);
    } catch (e) {
      setRecomputeMsg(e.message || "Recompute failed.");
      setRecomputeIsError(true);
    } finally {
      setRecomputeLoading(false);
    }
  };

  /* ─── shared styles ─── */

  const inputCls = [
    "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2",
    "text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1",
  ].join(" ");

  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 600,
    marginBottom: 4, color: "var(--text-primary)",
  };

  /* ─── form field renderer (driven by FORM_FIELDS config) ─── */

  const renderFormField = (field) => {
    const { key, label, type, required, placeholder, options, transform } = field;
    const value = form[key];
    const onChange = e => {
      const v = transform ? transform(e.target.value) : e.target.value;
      setForm(f => ({ ...f, [key]: v }));
    };

    let input;
    if (type === "textarea") {
      input = (
        <textarea className={inputCls} rows={2} value={value}
          onChange={onChange} placeholder={placeholder}
          style={{ resize: "vertical" }} />
      );
    } else if (type === "select") {
      const opts = options === "CLUSTERS"
        ? [{ value: "", label: "— No cluster —" }, ...clusters.map(c => ({ value: String(c.id), label: c.name }))]
        : (options || []).map(o => ({ value: o, label: o || "— Not set —" }));
      input = (
        <select className={inputCls} value={value} onChange={onChange}>
          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    } else {
      input = (
        <input type={type} className={inputCls} value={value}
          onChange={onChange} placeholder={placeholder} />
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

  /* ─── render ─── */

  return (
    <SkeletonPage
      title="Careers"
      subtitle={subtitleText()}
      loading={loading}
      error={!loading ? error : ""}
      onRetry={loadAll}
      actions={
        !loading && !error && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Vectors timestamp + recompute status */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              {vectorsComputedAt && (
                <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  Vectors last computed: <strong>{vectorsComputedAt}</strong>
                </span>
              )}
              {recomputeMsg && (
                <span style={{
                  fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                  color: recomputeIsError ? "#dc2626" : "#166534",
                }}>
                  {recomputeIsError ? "⚠ " : "✓ "}{recomputeMsg}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRecompute}
              disabled={recomputeLoading || formMode !== null}
            >
              {recomputeLoading ? "Recomputing…" : "Recompute Vectors"}
            </Button>
            <Button onClick={openCreate} disabled={formMode !== null}>+ New Career</Button>
          </div>
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
      {/* ── Create / Edit form (config-driven) ── */}
      {formMode !== null && (
        <Card className="mb-6">
          <h2 style={{ margin: "0 0 16px", fontSize: "var(--font-size-lg)", fontWeight: 700 }}>
            {isEditing ? `Edit — ${formMode.title}` : "Create Career"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            {FORM_FIELDS.map(renderFormField)}
          </div>
          {formError && (
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#dc2626" }}>{formError}</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : isEditing ? "Save changes" : "Create career"}
            </Button>
            <Button variant="secondary" onClick={closeForm} disabled={saving}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* ── Delete confirmation ── */}
      {deletingId !== null && (
        <Card className="mb-6">
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-primary)" }}>
            Delete career <strong>{careers.find(c => c.id === deletingId)?.title}</strong>?
            This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="danger" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? "Deleting…" : "Yes, delete"}
            </Button>
            <Button variant="secondary" onClick={() => setDeletingId(null)} disabled={deleting}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className={inputCls}
          style={{ maxWidth: 280 }}
          placeholder="Search by title or code…"
          value={search}
          onChange={e => { setSearch(e.target.value); setShowAll(false); setExpandedId(null); }}
        />
        <select
          className={inputCls}
          style={{ maxWidth: 220 }}
          value={clusterFilter}
          onChange={e => { setClusterFilter(e.target.value); setShowAll(false); setExpandedId(null); }}
        >
          <option value="">All Clusters</option>
          {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(search || clusterFilter) && (
          <Button size="sm" variant="ghost"
            onClick={() => { setSearch(""); setClusterFilter(""); setShowAll(false); setExpandedId(null); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
          No careers match the current filters.
        </p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                  {["ID", "Title", "Code", "Cluster", "Description", "Stream", "Salary Entry", "Risk", "Actions"].map(h => (
                    <th key={h} style={{
                      padding: "8px 10px", fontWeight: 700,
                      color: "var(--text-muted)", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((career, idx) => (
                  <Fragment key={career.id}>
                    <tr style={{
                      borderBottom: expandedId === career.id ? "none" : "1px solid var(--border)",
                      background: expandedId === career.id
                        ? "#dbeafe"
                        : idx % 2 === 0 ? "transparent" : "var(--bg-app)",
                    }}>
                      <td style={{ padding: "9px 10px", color: "var(--text-muted)", fontFamily: "monospace", fontSize: 11 }}>
                        {career.id}
                      </td>
                      <td style={{ padding: "9px 10px", fontWeight: 600, maxWidth: 220 }}>
                        {/* Clickable title toggles detail panel */}
                        <span
                          onClick={() => setExpandedId(expandedId === career.id ? null : career.id)}
                          style={{
                            color: "#0d9488", cursor: "pointer",
                            textDecoration: expandedId === career.id ? "underline" : "none",
                          }}
                          title="Click to expand details"
                        >
                          {career.title}
                        </span>
                        {expandedId === career.id && (
                          <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>▲</span>
                        )}
                      </td>
                      <td style={{ padding: "9px 10px", fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {career.career_code || "—"}
                      </td>
                      <td style={{ padding: "9px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {clusterName(career.cluster_id)}
                      </td>
                      <td style={{ padding: "9px 10px", color: "var(--text-muted)", maxWidth: 260 }}>
                        {trunc(career.description)}
                      </td>
                      <td style={{ padding: "9px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {career.recommended_stream || "—"}
                      </td>
                      <td style={{ padding: "9px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {inrLakh(career.salary_entry_inr)}
                      </td>
                      <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                        {career.automation_risk
                          ? <span style={{
                              fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                              background: career.automation_risk === "high" ? "#fee2e2" : career.automation_risk === "medium" ? "#fef9c3" : "#dcfce7",
                              color:      career.automation_risk === "high" ? "#991b1b" : career.automation_risk === "medium" ? "#854d0e" : "#166534",
                            }}>{career.automation_risk}</span>
                          : <span style={{ color: "var(--text-muted)" }}>—</span>
                        }
                      </td>
                      <td style={{ padding: "9px 10px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                          <Button size="sm" variant="secondary"
                            onClick={() => openEdit(career)}
                            disabled={formMode !== null || deletingId !== null}>
                            Edit
                          </Button>
                          <Button size="sm" variant="danger"
                            onClick={() => setDeletingId(career.id)}
                            disabled={formMode !== null || deletingId !== null}>
                            Delete
                          </Button>
                          <Button
                            size="sm"
                            variant={proximityId === career.id ? "primary" : "ghost"}
                            onClick={() => handleProximity(career)}
                            disabled={formMode !== null || deletingId !== null}
                          >
                            {proximityMap[career.id]?.loading ? "…" : "Proximity"}
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Detail panel (only when expanded) ── */}
                    {expandedId === career.id && (
                      <DetailPanel career={career} onEdit={openEdit} />
                    )}

                    {/* ── Proximity panel ── */}
                    {proximityId === career.id && proximityMap[career.id] && (
                      <ProximityPanel
                        entry={proximityMap[career.id]}
                        clusterName={clusterName}
                      />
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Showing {displayed.length} of {filtered.length} careers
            </span>
            {!showAll && filtered.length > PAGE_SIZE && (
              <Button size="sm" variant="secondary" onClick={() => setShowAll(true)}>
                Show all {filtered.length}
              </Button>
            )}
            {showAll && filtered.length > PAGE_SIZE && (
              <Button size="sm" variant="ghost" onClick={() => setShowAll(false)}>
                Collapse to first {PAGE_SIZE}
              </Button>
            )}
          </div>
        </>
      )}
    </SkeletonPage>
  );
}
