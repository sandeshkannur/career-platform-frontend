// src/pages/admin/AdminCareerClustersPage.jsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import { apiGet, apiPost, apiPut, apiDelete } from "../../apiClient";

const EMPTY_FORM = { name: "", description: "" };

function CareerCountBadge({ count }) {
  if (count < 5 || count > 50) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: "#fef9c3", color: "#854d0e",
        border: "1px solid #fde68a", borderRadius: 4,
        fontSize: 11, padding: "1px 7px", fontWeight: 600,
      }}>
        ⚠ {count}
      </span>
    );
  }
  return <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{count}</span>;
}

export default function AdminCareerClustersPage() {
  const [clusters, setClusters] = useState([]);
  const [careerCounts, setCareerCounts] = useState({});   // cluster_id → count
  const [skillCounts, setSkillCounts] = useState({});     // cluster_id → count
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  // null = closed, "create" = new, {id, name, description} = editing
  const [formMode, setFormMode] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState(null);   // id awaiting confirmation
  const [deleting, setDeleting] = useState(false);

  /* ─── data fetching ─── */

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [clustersData, careersData, skillsData] = await Promise.all([
        apiGet("/v1/career-clusters"),
        apiGet("/v1/careers"),
        apiGet("/v1/key-skills"),
      ]);

      const clusterList = Array.isArray(clustersData) ? clustersData : (clustersData?.clusters ?? []);
      const careerList  = Array.isArray(careersData)  ? careersData  : (careersData?.careers   ?? []);
      const skillList   = Array.isArray(skillsData)   ? skillsData   : (skillsData?.key_skills ?? skillsData?.keyskills ?? []);

      // count per cluster_id
      const cc = {};
      careerList.forEach(c => {
        if (c.cluster_id != null) cc[c.cluster_id] = (cc[c.cluster_id] || 0) + 1;
      });
      const sc = {};
      skillList.forEach(s => {
        if (s.cluster_id != null) sc[s.cluster_id] = (sc[s.cluster_id] || 0) + 1;
      });

      setClusters(clusterList);
      setCareerCounts(cc);
      setSkillCounts(sc);
    } catch (e) {
      setError(e.message || "Failed to load clusters.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ─── form helpers ─── */

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setFormMode("create");
  };

  const openEdit = (cluster) => {
    setForm({ name: cluster.name, description: cluster.description || "" });
    setFormError("");
    setFormMode(cluster);
  };

  const closeForm = () => {
    setFormMode(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      if (formMode === "create") {
        await apiPost("/v1/career-clusters", { name: form.name.trim(), description: form.description.trim() });
      } else {
        await apiPut(`/v1/career-clusters/${formMode.id}`, { name: form.name.trim(), description: form.description.trim() });
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
      await apiDelete(`/v1/career-clusters/${deletingId}`);
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

  /* ─── render ─── */

  const isEditing = formMode && formMode !== "create";
  const formTitle = formMode === "create" ? "Create cluster" : `Edit — ${formMode?.name}`;

  return (
    <SkeletonPage
      title="Career Clusters"
      subtitle={loading ? "Loading…" : `${clusters.length} clusters`}
      loading={loading}
      error={!loading ? error : ""}
      onRetry={loadAll}
      actions={
        !loading && !error && (
          <Button onClick={openCreate} disabled={formMode !== null}>+ New Cluster</Button>
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
          <h2 style={{ margin: "0 0 14px", fontSize: "var(--font-size-lg)", fontWeight: 700 }}>
            {formTitle}
          </h2>
          <div style={{ display: "grid", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>
                Name <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                className={inputCls}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Technology"
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>
                Description
              </label>
              <textarea
                className={inputCls}
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this cluster (optional)"
                style={{ resize: "vertical" }}
              />
            </div>
          </div>
          {formError && (
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#dc2626" }}>{formError}</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : isEditing ? "Save changes" : "Create cluster"}
            </Button>
            <Button variant="secondary" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* ── Delete confirmation ── */}
      {deletingId !== null && (
        <Card className="mb-6" style={{ borderColor: "#fca5a5" }}>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-primary)" }}>
            Delete cluster <strong>{clusters.find(c => c.id === deletingId)?.name}</strong>?
            This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="danger" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? "Deleting…" : "Yes, delete"}
            </Button>
            <Button variant="secondary" onClick={() => setDeletingId(null)} disabled={deleting}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* ── Table ── */}
      {clusters.length === 0 && !loading ? (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
          No clusters yet. Click "+ New Cluster" to create one.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                {["ID", "Name", "Description", "Careers", "Key Skills", "Actions"].map(h => (
                  <th key={h} style={{
                    padding: "8px 12px", fontWeight: 700,
                    color: "var(--text-muted)", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clusters.map((cluster, idx) => (
                <tr
                  key={cluster.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: idx % 2 === 0 ? "transparent" : "var(--bg-app)",
                  }}
                >
                  <td style={{ padding: "10px 12px", color: "var(--text-muted)", fontFamily: "monospace", fontSize: 12 }}>
                    {cluster.id}
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {cluster.name}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--text-muted)", maxWidth: 320 }}>
                    {cluster.description || <span style={{ fontStyle: "italic" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <CareerCountBadge count={careerCounts[cluster.id] ?? 0} />
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-primary)", fontWeight: 500 }}>
                    {skillCounts[cluster.id] ?? 0}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEdit(cluster)}
                        disabled={formMode !== null || deletingId !== null}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setDeletingId(cluster.id)}
                        disabled={formMode !== null || deletingId !== null}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>
            ⚠ Yellow badge = cluster has fewer than 5 or more than 50 careers — check cluster health.
          </p>
        </div>
      )}
    </SkeletonPage>
  );
}
