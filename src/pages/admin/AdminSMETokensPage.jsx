/**
 * src/pages/admin/AdminSMETokensPage.jsx
 *
 * ADM-B02: SME Submission Token Management.
 *
 * What this page does:
 *   - Lists all submission tokens with status (pending/submitted/expired)
 *   - Admin generates a new token for an SME+career pair
 *   - Copies the form link to clipboard for sending to the SME
 *   - Filter tabs: All / Pending / Submitted / Expired
 *
 * What this page does NOT do:
 *   - No student data access
 *   - No scoring or assessment logic
 *   - Does not send emails (that is ADM-B05 scheduler)
 */

import { useState, useEffect, useCallback } from "react";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import { listSMETokens, createSMEToken, listSMEs } from "../../api/admin";
import { useAdminContent } from "../../locales/AdminLanguageProvider";

// ── Status badge ──────────────────────────────────────────────────────────
function StatusBadge({ status, t }) {
  const colors = {
    pending:   { bg: "#FFF3CD", color: "#856404" },
    submitted: { bg: "#E2EFDA", color: "#375623" },
    expired:   { bg: "#F2F2F2", color: "#666"    },
  };
  const c = colors[status] || colors.expired;
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 12,
      fontSize: 12, fontWeight: 500, background: c.bg, color: c.color,
    }}>
      {t(`admin.tokens.status.${status}`, status)}
    </span>
  );
}

// ── Form link copy button ─────────────────────────────────────────────────
function CopyLinkButton({ token, t }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/sme/form/${token}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement("textarea");
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button onClick={handleCopy} style={{
      background: "none", border: "1px solid #1F3864",
      color: copied ? "#375623" : "#1F3864",
      borderColor: copied ? "#375623" : "#1F3864",
      borderRadius: 4, padding: "2px 10px",
      cursor: "pointer", fontSize: 12, whiteSpace: "nowrap",
    }}>
      {copied
        ? t("admin.tokens.link.copied", "Copied!")
        : t("admin.tokens.link.copy", "Copy link")}
    </button>
  );
}

// ── Empty form state ──────────────────────────────────────────────────────
const EMPTY_FORM = {
  sme_id: "", career_id: "", round_number: "1", expires_days: "14",
};

// ── Format date helper ────────────────────────────────────────────────────
function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function AdminSMETokensPage() {
  const { t } = useAdminContent();

  const [tokens, setTokens]           = useState([]);
  const [smes, setSmes]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [filter, setFilter]           = useState("all");
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState(null);

  // ── Load tokens ──────────────────────────────────────────────────────
  const loadTokens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = filter === "all" ? null : filter;
      const data = await listSMETokens(status);
      setTokens(Array.isArray(data) ? data : []);
    } catch {
      setError(t("admin.tokens.error.loadFailed", "Failed to load tokens."));
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  // ── Load SMEs for dropdown ────────────────────────────────────────────
  useEffect(() => {
    listSMEs("active").then(data => setSmes(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  useEffect(() => { loadTokens(); }, [loadTokens]);

  // ── Form field change ────────────────────────────────────────────────
  function handleField(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // ── Generate token ───────────────────────────────────────────────────
  async function handleGenerate(e) {
    e.preventDefault();
    setFormError(null);
    if (!form.sme_id || !form.career_id) {
      setFormError(t("admin.tokens.form.errorRequired", "SME and Career ID are required."));
      return;
    }
    setSubmitting(true);
    try {
      await createSMEToken(parseInt(form.sme_id), {
        career_id:    parseInt(form.career_id),
        round_number: parseInt(form.round_number) || 1,
        expires_days: parseInt(form.expires_days) || 14,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadTokens();
    } catch (err) {
      setFormError(err?.message || t("admin.tokens.error.generateFailed", "Failed to generate token."));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Filter tab counts ────────────────────────────────────────────────
  const pendingCount   = tokens.filter(t => t.status === "pending").length;
  const submittedCount = tokens.filter(t => t.status === "submitted").length;
  const expiredCount   = tokens.filter(t => t.status === "expired").length;

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <SkeletonPage
      title={t("admin.tokens.pageTitle", "SME Submission Tokens")}
      subtitle={t("admin.tokens.pageSubtitle", "Generate and manage submission links sent to Subject Matter Experts.")}
      actions={
        <Button onClick={() => { setShowForm(v => !v); setFormError(null); }}>
          {showForm
            ? t("admin.tokens.cancelButton", "Cancel")
            : t("admin.tokens.generateButton", "Generate Token")}
        </Button>
      }
    >
      {/* ── Filter tabs ──────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { key: "all",       label: t("admin.tokens.filter.all",       "All ({{count}})",       { count: tokens.length }) },
          { key: "pending",   label: t("admin.tokens.filter.pending",   "Pending ({{count}})",   { count: pendingCount }) },
          { key: "submitted", label: t("admin.tokens.filter.submitted", "Submitted ({{count}})", { count: submittedCount }) },
          { key: "expired",   label: t("admin.tokens.filter.expired",   "Expired ({{count}})",   { count: expiredCount }) },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
            padding: "4px 14px", borderRadius: 16, border: "1px solid",
            borderColor: filter === tab.key ? "#1F3864" : "#ccc",
            background: filter === tab.key ? "#1F3864" : "transparent",
            color: filter === tab.key ? "#fff" : "#444",
            cursor: "pointer", fontSize: 13,
            fontWeight: filter === tab.key ? 500 : 400,
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Generate token form ───────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleGenerate} style={{
          background: "#F8F9FA", border: "1px solid #dee2e6",
          borderRadius: 8, padding: 20, marginBottom: 20,
        }}>
          <div style={{ fontWeight: 500, marginBottom: 14, fontSize: 15 }}>
            {t("admin.tokens.form.title", "Generate Submission Token")}
          </div>

          {formError && (
            <div style={{ color: "#c00", marginBottom: 12, fontSize: 13 }}>{formError}</div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {/* SME dropdown */}
            <label style={{ fontSize: 13 }}>
              {t("admin.tokens.form.selectSME", "Select SME")} *
              <select name="sme_id" value={form.sme_id} onChange={handleField}
                required style={{ ...inputStyle, height: 34 }}>
                <option value="">— Select SME —</option>
                {smes.map(sme => (
                  <option key={sme.id} value={sme.id}>
                    {sme.full_name} ({sme.email})
                  </option>
                ))}
              </select>
            </label>

            {/* Career ID */}
            <label style={{ fontSize: 13 }}>
              {t("admin.tokens.form.selectCareer", "Career ID")} *
              <input name="career_id" type="number" min="1"
                value={form.career_id} onChange={handleField}
                required style={inputStyle}
                placeholder={t("admin.tokens.form.careerPlaceholder", "Enter career ID")} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <label style={{ fontSize: 13 }}>
              {t("admin.tokens.form.roundNumber", "Round number")}
              <input name="round_number" type="number" min="1" max="99"
                value={form.round_number} onChange={handleField} style={inputStyle} />
            </label>
            <label style={{ fontSize: 13 }}>
              {t("admin.tokens.form.expiresDays", "Expires in (days)")}
              <input name="expires_days" type="number" min="1" max="90"
                value={form.expires_days} onChange={handleField} style={inputStyle} />
            </label>
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting
              ? t("admin.tokens.form.submitting", "Generating…")
              : t("admin.tokens.form.submitButton", "Generate")}
          </Button>
        </form>
      )}

      {/* ── Error ─────────────────────────────────────────────────── */}
      {error && <div style={{ color: "#c00", padding: 16, fontSize: 14 }}>{error}</div>}

      {/* ── Loading ───────────────────────────────────────────────── */}
      {loading && (
        <div style={{ color: "#888", padding: 16, fontSize: 14 }}>
          {t("admin.tokens.loading", "Loading tokens…")}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {!loading && !error && tokens.length === 0 && (
        <div style={{ color: "#888", padding: 24, textAlign: "center", fontSize: 14 }}>
          {t("admin.tokens.empty.noResults", "No tokens found.")}
        </div>
      )}

      {/* ── Tokens table ─────────────────────────────────────────── */}
      {!loading && !error && tokens.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #dee2e6", textAlign: "left" }}>
                {[
                  ["admin.tokens.table.sme",        "SME"],
                  ["admin.tokens.table.career",      "Career"],
                  ["admin.tokens.table.round",       "Round"],
                  ["admin.tokens.table.status",      "Status"],
                  ["admin.tokens.table.expires",     "Expires"],
                  ["admin.tokens.table.submitted",   "Submitted"],
                  ["admin.tokens.table.disclaimer",  "Disclaimer"],
                  ["admin.tokens.table.link",        "Form Link"],
                ].map(([key, fallback]) => (
                  <th key={key} style={thStyle}>{t(key, fallback)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tokens.map(tok => (
                <tr key={tok.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={tdStyle}>
                    <strong>{tok.sme_name || `SME #${tok.sme_id}`}</strong>
                  </td>
                  <td style={tdStyle}>{tok.career_title || `Career #${tok.career_id}`}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{tok.round_number}</td>
                  <td style={tdStyle}><StatusBadge status={tok.status} t={t} /></td>
                  <td style={tdStyle}>{formatDate(tok.expires_at)}</td>
                  <td style={tdStyle}>{formatDate(tok.submitted_at)}</td>
                  <td style={tdStyle}>
                    {tok.disclaimer_accepted
                      ? <span style={{ color: "#375623", fontSize: 12 }}>
                          {t("admin.tokens.disclaimer.accepted", "Accepted")}
                        </span>
                      : <span style={{ color: "#888", fontSize: 12 }}>
                          {t("admin.tokens.disclaimer.pending", "Not yet")}
                        </span>}
                  </td>
                  <td style={tdStyle}>
                    {tok.status === "pending"
                      ? <CopyLinkButton token={tok.token} t={t} />
                      : <span style={{ color: "#999", fontSize: 12 }}>—</span>}
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
