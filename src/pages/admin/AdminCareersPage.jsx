// src/pages/admin/AdminCareersPage.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import { apiGet, apiPost, apiPut, apiDelete } from "../../apiClient";

const PAGE_SIZE = 50;

const EMPTY_FORM = {
  title: "", career_code: "", description: "", cluster_id: "",
  recommended_stream: "", salary_entry_inr: "", salary_mid_inr: "",
  salary_peak_inr: "", automation_risk: "", future_outlook: "",
};

const STREAM_OPTIONS = [
  "", "Science PCM", "Science PCB", "Commerce", "Arts/Humanities", "Any",
];
const AUTOMATION_OPTIONS = ["", "low", "medium", "high"];
const OUTLOOK_OPTIONS    = ["", "growing", "stable", "declining"];

function trunc(str, n = 60) {
  if (!str) return "—";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function inrLakh(val) {
  const n = parseFloat(val);
  if (!n) return "—";
  return `₹${(n / 100000).toFixed(1)}L`;
}

export default function AdminCareersPage() {
  const [careers,  setCareers]  = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [formError, setFormError] = useState("");

  // filters (client-side)
  const [search,    setSearch]    = useState("");
  const [clusterFilter, setClusterFilter] = useState("");
  const [showAll,   setShowAll]   = useState(false);

  // form: null = closed | "create" | career object
  const [formMode, setFormMode] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // delete confirmation
  const [deletingId, setDeletingId] = useState(null);
  const [deleting,   setDeleting]   = useState(false);

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
    const total = filtered.length;
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
    setShowAll(false);
  };

  const openEdit = (career) => {
    setForm({
      title:              career.title              ?? "",
      career_code:        career.career_code        ?? "",
      description:        career.description        ?? "",
      cluster_id:         career.cluster_id != null ? String(career.cluster_id) : "",
      recommended_stream: career.recommended_stream ?? "",
      salary_entry_inr:   career.salary_entry_inr   != null ? String(career.salary_entry_inr) : "",
      salary_mid_inr:     career.salary_mid_inr     != null ? String(career.salary_mid_inr)   : "",
      salary_peak_inr:    career.salary_peak_inr    != null ? String(career.salary_peak_inr)  : "",
      automation_risk:    career.automation_risk    ?? "",
      future_outlook:     career.future_outlook     ?? "",
    });
    setFormError("");
    setFormMode(career);
  };

  const closeForm = () => {
    setFormMode(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const buildBody = () => ({
    title:              form.title.trim(),
    career_code:        form.career_code.trim().toUpperCase(),
    description:        form.description.trim() || null,
    cluster_id:         form.cluster_id ? Number(form.cluster_id) : null,
    recommended_stream: form.recommended_stream || null,
    salary_entry_inr:   form.salary_entry_inr ? Number(form.salary_entry_inr) : null,
    salary_mid_inr:     form.salary_mid_inr   ? Number(form.salary_mid_inr)   : null,
    salary_peak_inr:    form.salary_peak_inr  ? Number(form.salary_peak_inr)  : null,
    automation_risk:    form.automation_risk  || null,
    future_outlook:     form.future_outlook   || null,
  });

  const handleSave = async () => {
    if (!form.title.trim())       { setFormError("Title is required.");        return; }
    if (!form.career_code.trim()) { setFormError("Career code is required.");  return; }
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

  /* ─── shared input style ─── */

  const inputCls = [
    "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2",
    "text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1",
  ].join(" ");

  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 600,
    marginBottom: 4, color: "var(--text-primary)",
  };

  /* ─── form field groups ─── */

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
          <Button onClick={openCreate} disabled={formMode !== null}>+ New Career</Button>
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
            {isEditing ? `Edit — ${formMode.title}` : "Create Career"}
          </h2>

          {/* Row 1: Title + Code */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Title <span style={{ color: "#dc2626" }}>*</span></label>
              <input className={inputCls} value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Agricultural Scientist" autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Career Code <span style={{ color: "#dc2626" }}>*</span></label>
              <input className={inputCls} value={form.career_code}
                onChange={e => setForm(f => ({ ...f, career_code: e.target.value.toUpperCase() }))}
                placeholder="e.g. AGR_030" />
            </div>
          </div>

          {/* Row 2: Cluster + Stream */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Cluster</label>
              <select className={inputCls} value={form.cluster_id}
                onChange={e => setForm(f => ({ ...f, cluster_id: e.target.value }))}>
                <option value="">— No cluster —</option>
                {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Recommended Stream</label>
              <select className={inputCls} value={form.recommended_stream}
                onChange={e => setForm(f => ({ ...f, recommended_stream: e.target.value }))}>
                {STREAM_OPTIONS.map(s => <option key={s} value={s}>{s || "— Any —"}</option>)}
              </select>
            </div>
          </div>

          {/* Row 3: Description */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Description</label>
            <textarea className={inputCls} rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of this career (optional)"
              style={{ resize: "vertical" }} />
          </div>

          {/* Row 4: Salary trio */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Salary Entry (₹ INR)</label>
              <input type="number" className={inputCls} value={form.salary_entry_inr}
                onChange={e => setForm(f => ({ ...f, salary_entry_inr: e.target.value }))}
                placeholder="e.g. 400000" />
            </div>
            <div>
              <label style={labelStyle}>Salary Mid (₹ INR)</label>
              <input type="number" className={inputCls} value={form.salary_mid_inr}
                onChange={e => setForm(f => ({ ...f, salary_mid_inr: e.target.value }))}
                placeholder="e.g. 800000" />
            </div>
            <div>
              <label style={labelStyle}>Salary Peak (₹ INR)</label>
              <input type="number" className={inputCls} value={form.salary_peak_inr}
                onChange={e => setForm(f => ({ ...f, salary_peak_inr: e.target.value }))}
                placeholder="e.g. 2000000" />
            </div>
          </div>

          {/* Row 5: Automation risk + Future outlook */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Automation Risk</label>
              <select className={inputCls} value={form.automation_risk}
                onChange={e => setForm(f => ({ ...f, automation_risk: e.target.value }))}>
                {AUTOMATION_OPTIONS.map(o => <option key={o} value={o}>{o || "— Not set —"}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Future Outlook</label>
              <select className={inputCls} value={form.future_outlook}
                onChange={e => setForm(f => ({ ...f, future_outlook: e.target.value }))}>
                {OUTLOOK_OPTIONS.map(o => <option key={o} value={o}>{o || "— Not set —"}</option>)}
              </select>
            </div>
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
          onChange={e => { setSearch(e.target.value); setShowAll(false); }}
        />
        <select
          className={inputCls}
          style={{ maxWidth: 220 }}
          value={clusterFilter}
          onChange={e => { setClusterFilter(e.target.value); setShowAll(false); }}
        >
          <option value="">All Clusters</option>
          {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(search || clusterFilter) && (
          <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setClusterFilter(""); setShowAll(false); }}>
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
                  <tr
                    key={career.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: idx % 2 === 0 ? "transparent" : "var(--bg-app)",
                    }}
                  >
                    <td style={{ padding: "9px 10px", color: "var(--text-muted)", fontFamily: "monospace", fontSize: 11 }}>
                      {career.id}
                    </td>
                    <td style={{ padding: "9px 10px", fontWeight: 600, color: "var(--text-primary)", maxWidth: 220 }}>
                      {career.title}
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
                      <div style={{ display: "flex", gap: 6 }}>
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
                      </div>
                    </td>
                  </tr>
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
