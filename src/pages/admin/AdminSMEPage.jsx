/**
 * src/pages/admin/AdminSMEPage.jsx
 *
 * ADM-B01: SME Registry — list, create, and deactivate Subject Matter Experts.
 *
 * i18n: uses useAdminContent from AdminLanguageProvider (admin-only translations).
 *       Never imports from student LanguageProvider or en.json.
 *
 * What this page does:
 *   - Loads all SME profiles from GET /v1/admin/sme on mount
 *   - Shows a filterable table of SMEs (All / Active / Inactive)
 *   - "Add SME" opens an inline form to create a new profile
 *   - "Deactivate" soft-deletes an SME (status = inactive, row never deleted)
 *
 * What this page does NOT do:
 *   - No student data access
 *   - No scoring or assessment logic
 *   - No hard deletes
 */

import { useState, useEffect, useCallback } from "react";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import { listSMEs, createSME, deactivateSME } from "../../api/admin";
import { useAdminContent } from "../../locales/AdminLanguageProvider";

// ── Status badge ──────────────────────────────────────────────────────────
function StatusBadge({ status, t }) {
  const isActive = status === "active";
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 12,
      fontSize: 12, fontWeight: 500,
      background: isActive ? "#E2EFDA" : "#F2F2F2",
      color: isActive ? "#375623" : "#666",
    }}>
      {isActive
        ? t("admin.sme.status.active", "Active")
        : t("admin.sme.status.inactive", "Inactive")}
    </span>
  );
}

// ── Score cell (shows — when null) ────────────────────────────────────────
function Score({ value }) {
  return (
    <span style={{ fontFamily: "monospace", fontSize: 13 }}>
      {value != null ? value.toFixed(3) : "—"}
    </span>
  );
}

// ── Empty form state ──────────────────────────────────────────────────────
const EMPTY_FORM = {
  full_name: "", email: "", career_assignments: "",
  years_experience: "", seniority_score: "", education_score: "",
  sector_relevance: "", sector: "", education: "",
};

// ── Main page ─────────────────────────────────────────────────────────────
export default function AdminSMEPage() {
  const { t } = useAdminContent();

  const [smes, setSmes]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [filter, setFilter]           = useState("all");
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState(null);

  // ── Load SMEs ────────────────────────────────────────────────────────
  const loadSMEs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = filter === "all" ? null : filter;
      const data = await listSMEs(status);
      setSmes(Array.isArray(data) ? data : []);
    } catch {
      setError(t("admin.sme.error.loadFailed", "Failed to load SME profiles."));
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => { loadSMEs(); }, [loadSMEs]);

  // ── Form field change ────────────────────────────────────────────────
  function handleField(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // ── Create SME ───────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    setFormError(null);

    if (!form.full_name.trim() || !form.email.trim()) {
      setFormError(t("admin.sme.form.errorRequired", "Full name and email are required."));
      return;
    }

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
    };
    if (form.career_assignments.trim()) payload.career_assignments = form.career_assignments.trim();
    if (form.years_experience)  payload.years_experience = parseInt(form.years_experience, 10);
    if (form.seniority_score)   payload.seniority_score  = parseFloat(form.seniority_score);
    if (form.education_score)   payload.education_score  = parseFloat(form.education_score);
    if (form.sector_relevance)  payload.sector_relevance = parseFloat(form.sector_relevance);
    if (form.sector.trim())     payload.sector           = form.sector.trim();
    if (form.education.trim())  payload.education        = form.education.trim();

    setSubmitting(true);
    try {
      await createSME(payload);
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadSMEs();
    } catch {
      setFormError(t("admin.sme.error.createFailed", "Failed to create SME. Check the details and try again."));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Deactivate SME ───────────────────────────────────────────────────
  async function handleDeactivate(sme) {
    const msg = t(
      "admin.sme.action.deactivateConfirm",
      "Deactivate {{name}}? This is a soft delete — the record is kept for audit purposes.",
      { name: sme.full_name }
    );
    if (!window.confirm(msg)) return;
    try {
      await deactivateSME(sme.id);
      await loadSMEs();
    } catch {
      alert(t("admin.sme.error.deactivateFailed", "Failed to deactivate SME."));
    }
  }

  // ── Counts for filter tabs ───────────────────────────────────────────
  const activeCount   = smes.filter((s) => s.status === "active").length;
  const inactiveCount = smes.filter((s) => s.status === "inactive").length;

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <SkeletonPage
      title={t("admin.sme.pageTitle", "SME Registry")}
      subtitle={t("admin.sme.pageSubtitle", "Manage Subject Matter Experts used for career weight validation.")}
      actions={
        <Button onClick={() => { setShowForm((v) => !v); setFormError(null); }}>
          {showForm
            ? t("admin.sme.cancelButton", "Cancel")
            : t("admin.sme.addButton", "Add SME")}
        </Button>
      }
    >
      {/* ── Filter tabs ──────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { key: "all",      label: t("admin.sme.filter.all",      "All ({{count}})",      { count: smes.length }) },
          { key: "active",   label: t("admin.sme.filter.active",   "Active ({{count}})",   { count: activeCount }) },
          { key: "inactive", label: t("admin.sme.filter.inactive", "Inactive ({{count}})", { count: inactiveCount }) },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: "4px 14px", borderRadius: 16, border: "1px solid",
              borderColor: filter === tab.key ? "#1F3864" : "#ccc",
              background: filter === tab.key ? "#1F3864" : "transparent",
              color: filter === tab.key ? "#fff" : "#444",
              cursor: "pointer", fontSize: 13,
              fontWeight: filter === tab.key ? 500 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Create form ───────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleCreate} style={{
          background: "#F8F9FA", border: "1px solid #dee2e6",
          borderRadius: 8, padding: 20, marginBottom: 20,
        }}>
          <div style={{ fontWeight: 500, marginBottom: 14, fontSize: 15 }}>
            {t("admin.sme.form.title", "New SME Profile")}
          </div>

          {formError && (
            <div style={{ color: "#c00", marginBottom: 12, fontSize: 13 }}>
              {formError}
            </div>
          )}

          {/* Required fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <label style={{ fontSize: 13 }}>
              {t("admin.sme.form.fullName", "Full name")} *
              <input name="full_name" value={form.full_name} onChange={handleField}
                required style={inputStyle}
                placeholder={t("admin.sme.form.fullNamePlaceholder", "Dr. Ananya Sharma")} />
            </label>
            <label style={{ fontSize: 13 }}>
              {t("admin.sme.form.email", "Email")} *
              <input name="email" type="email" value={form.email} onChange={handleField}
                required style={inputStyle}
                placeholder={t("admin.sme.form.emailPlaceholder", "ananya@example.com")} />
            </label>
          </div>

          {/* Career assignments */}
          <label style={{ fontSize: 13, display: "block", marginBottom: 12 }}>
            {t("admin.sme.form.careerAssignments", "Career assignments (comma-separated IDs, max 3)")}
            <input name="career_assignments" value={form.career_assignments} onChange={handleField}
              style={inputStyle}
              placeholder={t("admin.sme.form.careerAssignmentsPlaceholder", "e.g. 12,45,88")} />
          </label>

          {/* Credential inputs */}
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: "#555" }}>
            {t("admin.sme.form.credentialInputsLabel", "Credential inputs (0.0 – 1.0 scores; years in whole numbers)")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[
              { name: "years_experience", label: "admin.sme.form.yearsExperience", fallback: "Years experience", type: "number", min: 0, max: 60,    step: 1,    placeholder: "12" },
              { name: "seniority_score",  label: "admin.sme.form.seniorityScore",  fallback: "Seniority score",  type: "number", min: 0, max: 1, step: 0.01, placeholder: "0.75" },
              { name: "education_score",  label: "admin.sme.form.educationScore",  fallback: "Education score",  type: "number", min: 0, max: 1, step: 0.01, placeholder: "0.80" },
              { name: "sector_relevance", label: "admin.sme.form.sectorRelevance", fallback: "Sector relevance", type: "number", min: 0, max: 1, step: 0.01, placeholder: "0.90" },
            ].map((field) => (
              <label key={field.name} style={{ fontSize: 13 }}>
                {t(field.label, field.fallback)}
                <input name={field.name} type={field.type}
                  min={field.min} max={field.max} step={field.step}
                  value={form[field.name]} onChange={handleField}
                  style={inputStyle} placeholder={field.placeholder} />
              </label>
            ))}
          </div>

          {/* Context fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <label style={{ fontSize: 13 }}>
              {t("admin.sme.form.sector", "Sector")}
              <input name="sector" value={form.sector} onChange={handleField}
                style={inputStyle}
                placeholder={t("admin.sme.form.sectorPlaceholder", "Healthcare")} />
            </label>
            <label style={{ fontSize: 13 }}>
              {t("admin.sme.form.education", "Education")}
              <input name="education" value={form.education} onChange={handleField}
                style={inputStyle}
                placeholder={t("admin.sme.form.educationPlaceholder", "PhD Psychology")} />
            </label>
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting
              ? t("admin.sme.form.submitting", "Creating…")
              : t("admin.sme.form.submitButton", "Create SME")}
          </Button>
        </form>
      )}

      {/* ── Error ─────────────────────────────────────────────────── */}
      {error && (
        <div style={{ color: "#c00", padding: 16, fontSize: 14 }}>{error}</div>
      )}

      {/* ── Loading ───────────────────────────────────────────────── */}
      {loading && (
        <div style={{ color: "#888", padding: 16, fontSize: 14 }}>
          {t("admin.sme.loading", "Loading SME profiles…")}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {!loading && !error && smes.length === 0 && (
        <div style={{ color: "#888", padding: 24, textAlign: "center", fontSize: 14 }}>
          {t("admin.sme.empty.noResults", "No SME profiles found.")}{" "}
          {filter !== "all" && (
            <span>
              <button onClick={() => setFilter("all")} style={{
                background: "none", border: "none", color: "#1F3864",
                cursor: "pointer", textDecoration: "underline", fontSize: 14,
              }}>
                {t("admin.sme.empty.tryAll", "Try switching to All.")}
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────── */}
      {!loading && !error && smes.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #dee2e6", textAlign: "left" }}>
                {[
                  ["admin.sme.table.name",        "Name"],
                  ["admin.sme.table.email",        "Email"],
                  ["admin.sme.table.sector",       "Sector"],
                  ["admin.sme.table.years",        "Yrs"],
                  ["admin.sme.table.credScore",    "Cred. score"],
                  ["admin.sme.table.calibScore",   "Calib. score"],
                  ["admin.sme.table.submissions",  "Submissions"],
                  ["admin.sme.table.status",       "Status"],
                  ["admin.sme.table.actions",      "Actions"],
                ].map(([key, fallback]) => (
                  <th key={key} style={thStyle}>{t(key, fallback)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {smes.map((sme) => (
                <tr key={sme.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={tdStyle}><strong>{sme.full_name}</strong></td>
                  <td style={tdStyle}>{sme.email}</td>
                  <td style={tdStyle}>{sme.sector || "—"}</td>
                  <td style={tdStyle}>{sme.years_experience ?? "—"}</td>
                  <td style={tdStyle}><Score value={sme.credentials_score} /></td>
                  <td style={tdStyle}><Score value={sme.calibration_score} /></td>
                  <td style={tdStyle}>{sme.submission_count}</td>
                  <td style={tdStyle}><StatusBadge status={sme.status} t={t} /></td>
                  <td style={tdStyle}>
                    {sme.status === "active" ? (
                      <button onClick={() => handleDeactivate(sme)} style={{
                        background: "none", border: "1px solid #c00",
                        color: "#c00", borderRadius: 4, padding: "2px 10px",
                        cursor: "pointer", fontSize: 12,
                      }}>
                        {t("admin.sme.action.deactivate", "Deactivate")}
                      </button>
                    ) : (
                      <span style={{ color: "#999", fontSize: 12 }}>
                        {t("admin.sme.status.inactive", "Inactive")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SkeletonPage>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────
const inputStyle = {
  display: "block", width: "100%", marginTop: 4, padding: "6px 10px",
  borderRadius: 4, border: "1px solid #ced4da", fontSize: 13, boxSizing: "border-box",
};
const thStyle = { padding: "8px 12px", fontWeight: 500, color: "#555", whiteSpace: "nowrap" };
const tdStyle = { padding: "8px 12px", verticalAlign: "middle" };
