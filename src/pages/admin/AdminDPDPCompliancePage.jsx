// src/pages/admin/AdminDPDPCompliancePage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import { apiGet } from "../../apiClient";

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────────────────────── */

function rateColor(rate, thresholdHigh, thresholdLow) {
  if (rate >= thresholdHigh) return { color: "#15803d", bg: "#dcfce7", border: "#86efac" };
  if (rate >= thresholdLow)  return { color: "#d97706", bg: "#fef9c3", border: "#fde68a" };
  return                            { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" };
}

function formatRate(rate) {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function formatNumber(n) {
  if (n == null) return "—";
  return n.toLocaleString();
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   KPI CARD
────────────────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, subtitle, colorStyle }) {
  return (
    <div style={{
      flex: "1 1 180px",
      padding: "20px 18px",
      borderRadius: 12,
      border: `1px solid ${colorStyle?.border ?? "var(--border)"}`,
      background: colorStyle?.bg ?? "var(--card)",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{
        fontSize: 36, fontWeight: 800, lineHeight: 1.1,
        color: colorStyle?.color ?? "var(--text-primary)",
      }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{subtitle}</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   COMPLIANCE STATUS
────────────────────────────────────────────────────────────────────────── */
function complianceStatus(consentRate, minorConsentRate) {
  const cr  = consentRate      ?? 0;
  const mcr = minorConsentRate ?? 0;

  if (cr < 0.70 || mcr < 0.80) {
    return { label: "Non-Compliant", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", dot: "#dc2626" };
  }
  if (cr >= 0.90 && mcr >= 0.95) {
    return { label: "Compliant", color: "#15803d", bg: "#dcfce7", border: "#86efac", dot: "#15803d" };
  }
  return { label: "Needs Attention", color: "#d97706", bg: "#fef9c3", border: "#fde68a", dot: "#f59e0b" };
}

/* ─────────────────────────────────────────────────────────────────────────
   PLACEHOLDER CARD (coming-soon feature)
────────────────────────────────────────────────────────────────────────── */
function PlaceholderCard({ title, description }) {
  return (
    <div style={{
      padding: "20px 18px",
      borderRadius: 12,
      border: "1px dashed var(--border)",
      background: "var(--bg-app)",
      opacity: 0.6,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
        {description}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE
────────────────────────────────────────────────────────────────────────── */
export default function AdminDPDPCompliancePage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiGet("/v1/admin/compliance/dpdp");
      setData(result);
    } catch (e) {
      setError(e.message || "Failed to load compliance data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  /* ─── derived values ─── */

  const totalStudents     = data?.total_students;
  const consentRate       = data?.consent_rate;        // 0–1 float
  const minorStudents     = data?.minor_students;
  const minorConsentRate  = data?.minor_consent_rate;  // 0–1 float
  const dataRetentionDays = data?.data_retention_days;
  const pendingDeletions  = data?.pending_deletions;
  const recentConsents    = Array.isArray(data?.recent_consents) ? data.recent_consents : [];

  const crStyle  = consentRate      != null ? rateColor(consentRate,      0.90, 0.70) : null;
  const mcrStyle = minorConsentRate != null ? rateColor(minorConsentRate, 0.95, 0.80) : null;
  const status   = data ? complianceStatus(consentRate, minorConsentRate) : null;

  /* ─── input style (unused, for future inline forms) ─── */

  /* ─── table header style ─── */

  const thStyle = {
    padding: "8px 12px", fontWeight: 700,
    color: "var(--text-muted)", whiteSpace: "nowrap",
    textAlign: "left",
  };

  const tdStyle = {
    padding: "9px 12px",
    color: "var(--text-primary)",
    fontSize: 13,
    borderBottom: "1px solid var(--border)",
  };

  /* ─── render ─── */

  return (
    <SkeletonPage
      title="DPDP Compliance"
      subtitle="Digital Personal Data Protection Act 2023 — consent and data governance overview"
      loading={loading}
      error={!loading ? error : ""}
      onRetry={loadAll}
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
      {/* ── 1. KPI CARDS ── */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard
          label="Total Students"
          value={formatNumber(totalStudents)}
          subtitle="registered on platform"
        />
        <KpiCard
          label="Consent Rate"
          value={formatRate(consentRate)}
          subtitle="overall consent coverage"
          colorStyle={crStyle}
        />
        <KpiCard
          label="Minor Students"
          value={formatNumber(minorStudents)}
          subtitle="under 18"
        />
        <KpiCard
          label="Minor Consent Rate"
          value={formatRate(minorConsentRate)}
          subtitle="guardian consent coverage"
          colorStyle={mcrStyle}
        />
      </div>

      {/* ── 2. COMPLIANCE STATUS CARD ── */}
      {status && (
        <Card>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            {/* Traffic-light pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 18px", borderRadius: 8,
              background: status.bg, border: `1px solid ${status.border}`,
              flexShrink: 0,
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: "50%",
                background: status.dot, flexShrink: 0,
              }} />
              <span style={{ fontWeight: 800, fontSize: 16, color: status.color }}>
                {status.label}
              </span>
            </div>

            {/* Detail grid */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", flex: 1 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                  Data Retention
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                  {dataRetentionDays != null ? `${dataRetentionDays} days` : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                  Pending Deletions
                </div>
                <div style={{
                  fontSize: 15, fontWeight: 700,
                  color: pendingDeletions > 0 ? "#dc2626" : "var(--text-primary)",
                }}>
                  {formatNumber(pendingDeletions)}
                </div>
              </div>
            </div>

            {/* Legal blurb */}
            <div style={{
              flex: "1 1 260px",
              fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6,
              borderLeft: "3px solid var(--border)", paddingLeft: 14,
            }}>
              DPDP Act 2023 requires informed consent for all users and guardian consent for minors.
              Consent rate ≥ 90% and minor consent rate ≥ 95% are required for full compliance.
            </div>
          </div>
        </Card>
      )}

      {/* ── 3. RECENT CONSENT LOG ── */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
          Recent Consent Log
        </div>

        {recentConsents.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "12px 0" }}>
            No recent consent records found.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["Student ID", "Consent Type", "Guardian ID", "Consented At"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentConsents.slice(0, 20).map((row, idx) => (
                  <tr key={idx} style={{
                    background: idx % 2 === 0 ? "transparent" : "var(--bg-app)",
                  }}>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>
                      {row.student_id ?? "—"}
                    </td>
                    <td style={tdStyle}>
                      {row.consent_type
                        ? <span style={{
                            display: "inline-block",
                            fontSize: 11, fontWeight: 600,
                            padding: "2px 8px", borderRadius: 4,
                            background: "#dbeafe", color: "#1e40af",
                          }}>
                            {row.consent_type}
                          </span>
                        : "—"
                      }
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                      {row.guardian_id ?? <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td style={{ ...tdStyle, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {formatDateTime(row.consented_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. FUTURE PLACEHOLDERS ── */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>
          Upcoming Features
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px" }}>
            <PlaceholderCard
              title="Deletion Request Queue"
              description="Coming soon: manage data deletion requests submitted by students or guardians."
            />
          </div>
          <div style={{ flex: "1 1 260px" }}>
            <PlaceholderCard
              title="Data Retention Policy"
              description="Coming soon: configure retention periods per data type (assessments, profiles, logs)."
            />
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
