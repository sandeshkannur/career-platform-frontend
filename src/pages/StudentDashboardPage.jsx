// src/pages/StudentDashboardPage.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import Button from "../ui/Button";
import { useSession } from "../hooks/useSession";
import { useContent } from "../locales/LanguageProvider";

import {
  getStudentDashboard,
  getStudentAssessments,
  getStudentResults,
} from "../api/students";

// ─── tiny icon components ────────────────────────────────────────────────────
function Icon({ path, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  assessment: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  results:    "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  history:    "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  onboarding: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  report:     "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  career:     "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  consent:    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
};

// ─── card component ───────────────────────────────────────────────────────────
function ActionCard({ icon, title, body, onClick, accent = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: accent ? "var(--brand-primary)" : "#fff",
        color: accent ? "#fff" : "var(--text)",
        border: accent ? "none" : "1px solid var(--border)",
        borderRadius: 16,
        padding: "18px 20px",
        textAlign: "left",
        cursor: "pointer",
        transition: "box-shadow 0.15s, transform 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: accent ? "rgba(255,255,255,0.2)" : "var(--bg-app)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: accent ? "#fff" : "var(--brand-primary)",
      }}>
        <Icon path={icon} size={18} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{title}</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, lineHeight: 1.5 }}>{body}</div>
      </div>
    </button>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const { logout, sessionUser } = useSession();
  const { t } = useContent();

  const studentId = useMemo(() => {
    return sessionUser?.student_profile?.student_id ?? null;
  }, [sessionUser]);

  const isStudent = sessionUser?.role === "student";
  const isMinor = sessionUser?.is_minor === true;
  const showConsentVerified = isStudent && isMinor && sessionUser?.consent_verified === true;
  const showConsentRequired = isStudent && isMinor && sessionUser?.consent_verified !== true;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [assessments, setAssessments] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!studentId) return;
      setLoading(true);
      setError(null);
      try {
        const [d, a, r] = await Promise.all([
          getStudentDashboard(studentId),
          getStudentAssessments(studentId),
          getStudentResults(studentId),
        ]);
        if (cancelled) return;
        setDashboard(d);
        setAssessments(a);
        setResults(r);
      } catch (e) {
        if (cancelled) return;
        const status = e?.status || e?.response?.status;
        const message = e?.message || e?.detail || t("student.dashboard.errorTitle", "Failed to load dashboard data");
        // dashboard is best-effort — only show error for non-500
        if (status !== 500) setError({ status, message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [studentId]);

  // Derive useful display values
  const totalAssessments = dashboard?.assessment_kpis?.total_assessments ?? 0;
  const lastSubmitted = dashboard?.assessment_kpis?.last_submitted_at
    ? new Date(dashboard.assessment_kpis.last_submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const topSkills = Array.isArray(dashboard?.top_skills) ? dashboard.top_skills.slice(0, 5) : [];
  const latestCareer = results?.results?.[0]?.top_careers?.[0];
  const totalResults = results?.total_results ?? 0;

  const firstName = sessionUser?.full_name?.split(" ")[0] || "";

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
            {firstName
              ? `${t("student.dashboard.welcomePrefix", "Welcome,")} ${firstName} 👋`
              : t("student.dashboard.title", "Student Dashboard")}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
            {t("student.dashboard.chooseNext", "Choose what you want to do next.")}
          </p>
        </div>
        <Button onClick={logout} variant="secondary">{t("common.logout", "Logout")}</Button>
      </div>

      {/* ── Consent banners ────────────────────────────── */}
      {showConsentRequired && (
        <div style={{ marginBottom: 16, borderRadius: 12, border: "1px solid #f0c36d", background: "#fff9ef", padding: "12px 16px" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{t("consent.required.title", "Guardian consent required ⚠️")}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: "var(--text-muted)" }}>{t("consent.required.body", "Your account is marked as a minor. Please complete guardian consent verification.")}</div>
        </div>
      )}
      {showConsentVerified && (
        <div style={{ marginBottom: 16, borderRadius: 12, border: "1px solid #cfe9d6", background: "#f3fff6", padding: "12px 16px" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{t("consent.verified.title", "Parental consent verified ✅")}</div>
        </div>
      )}

      {/* ── KPI strip ──────────────────────────────────── */}
      {loading ? (
        <div style={{ borderRadius: 16, border: "1px solid var(--border)", background: "#fff", padding: "20px 24px", marginBottom: 20, fontSize: 13, color: "var(--text-muted)" }}>
          {t("student.dashboard.loading", "Loading dashboard data…")}
        </div>
      ) : (
        <div style={{
          borderRadius: 16, border: "1px solid var(--border)", background: "#fff",
          padding: "20px 24px", marginBottom: 20,
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 20,
        }}>
          {/* Assessments taken */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>
              {t("student.dashboard.kpi.assessments", "Assessments")}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--brand-primary)", lineHeight: 1 }}>
              {totalAssessments}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>taken</div>
          </div>

          {/* Last submitted */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>
              {t("student.dashboard.kpi.lastSubmitted", "Last submitted")}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
              {lastSubmitted || t("student.dashboard.kpi.notYet", "Not yet")}
            </div>
          </div>

          {/* Results ready */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>
              {t("student.dashboard.kpi.resultsHistory", "Results")}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--brand-primary)", lineHeight: 1 }}>
              {totalResults}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {t("student.dashboard.kpi.records", "record(s)")}
            </div>
          </div>

          {/* Latest career match */}
          {latestCareer && (
            <div style={{ gridColumn: "span 2" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>
                Latest top match
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{latestCareer.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{latestCareer.cluster}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Top strengths ──────────────────────────────── */}
      {topSkills.length > 0 && (
        <div style={{ borderRadius: 16, border: "1px solid var(--border)", background: "#fff", padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
            {t("student.dashboard.kpi.scoring", "Your top strengths")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {topSkills.map((s) => (
              <span key={s.skill_id} style={{
                borderRadius: 999, border: "1px solid #bae6fd",
                background: "#f0f9ff", color: "#0369a1",
                padding: "4px 12px", fontSize: 12, fontWeight: 600,
              }}>
                {s.skill_name || `Skill ${s.skill_id}`}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
            Based on your latest assessment. Take another to see how your strengths evolve.
          </div>
        </div>
      )}

      {/* ── Action cards ───────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <ActionCard
          icon={ICONS.assessment}
          title={t("student.dashboard.card.assessment.title", "Start / Resume Assessment")}
          body={t("student.dashboard.card.assessment.body", "Continue your assessment journey.")}
          onClick={() => navigate("/student/assessment")}
          accent={totalAssessments === 0}
        />
        <ActionCard
          icon={ICONS.results}
          title={t("student.dashboard.card.latestResults.title", "View Latest Results")}
          body={t("student.dashboard.card.latestResults.body", "See your latest career recommendations.")}
          onClick={() => navigate("/student/results/latest")}
          accent={totalAssessments > 0 && totalResults > 0}
        />
        <ActionCard
          icon={ICONS.history}
          title={t("student.dashboard.card.history.title", "Results History")}
          body={t("student.dashboard.card.history.body", "View all your previous submissions.")}
          onClick={() => navigate("/student/results/history")}
        />
        <ActionCard
          icon={ICONS.onboarding}
          title={t("student.dashboard.card.onboarding.title", "Onboarding / Context")}
          body={t("student.dashboard.card.onboarding.body", "Add optional context to improve recommendations.")}
          onClick={() => navigate("/student/onboarding")}
        />
        <ActionCard
          icon={ICONS.report}
          title={t("student.dashboard.card.report.title", "Report")}
          body={t("student.dashboard.card.report.body", "Downloadable report experience (coming soon).")}
          onClick={() => { if (!studentId) return navigate("/student/consent"); navigate(`/student/reports/${studentId}`); }}
        />
        <ActionCard
          icon={ICONS.career}
          title={t("student.dashboard.card.careerDetail.title", "Career Detail")}
          body={t("student.dashboard.card.careerDetail.body", "Deep dive into a career explanation (coming soon).")}
          onClick={() => navigate("/student/careers/1")}
        />
        {isMinor && (
          <ActionCard
            icon={ICONS.consent}
            title={t("student.dashboard.card.consent.title", "Consent (if minor)")}
            body={t("student.dashboard.card.consent.body", "Verify guardian consent if required.")}
            onClick={() => navigate("/student/consent")}
          />
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <Link to="/" style={{ fontSize: 13, color: "var(--brand-primary)", textDecoration: "none" }}>
          {t("nav.backHome", "← Home")}
        </Link>
      </div>
    </div>
  );
}