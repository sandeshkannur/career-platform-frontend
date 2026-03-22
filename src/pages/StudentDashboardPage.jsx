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

export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const { logout, sessionUser } = useSession();
  const { t } = useContent();

  // IMPORTANT: We need a stable studentId. Adjust only if your /v1/auth/me payload uses a different field.
  const studentId = useMemo(() => {
    // /v1/auth/me => student_profile.student_id is the real studentId for /v1/students/{id}/*
    return sessionUser?.student_profile?.student_id ?? null;
  }, [sessionUser]);

  // Step 1: Read-only consent indicator (no routing logic, no buttons)
  const isStudent = sessionUser?.role === "student";
  const isMinor = sessionUser?.is_minor === true;

  const showConsentVerified =
    isStudent && isMinor && sessionUser?.consent_verified === true;

  const showConsentRequired =
    isStudent && isMinor && sessionUser?.consent_verified !== true;

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
        // Keep ordering deterministic: request all in parallel, but assign results explicitly.
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

        // Normalize a readable error message without changing apiClient behavior
        const status = e?.status || e?.response?.status;
        const message =
          e?.message ||
          e?.detail ||
          e?.response?.data?.detail ||
          t("student.dashboard.errorTitle", "Failed to load dashboard data");

        setError({ status, message, raw: e });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">
            {t("student.dashboard.title", "Student Dashboard")}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {sessionUser?.full_name
              ? `${t("student.dashboard.welcomePrefix", "Welcome,")} ${sessionUser.full_name}. ${t("student.dashboard.chooseNext", "Choose what you want to do next.")}`
              : t("student.dashboard.chooseNext", "Choose what you want to do next.")}
          </p>
        </div>

        <div className="shrink-0">
          <Button onClick={logout}>{t("common.logout", "Logout")}</Button>
        </div>
      </div>

      {/* Step 1: Consent Required Indicator (READ-ONLY) */}
      {showConsentRequired && (
        <div className="mt-5 rounded-xl border border-[#f0c36d] bg-[#fff9ef] p-4">
          <div className="text-sm font-semibold">
            {t("consent.required.title", "Guardian consent required ⚠️")}
          </div>
          <div className="mt-1 text-sm text-[var(--text-muted)]">
            {t(
              "consent.required.body",
              "Your account is marked as a minor. Please complete guardian consent verification to unlock reports and continue."
            )}
          </div>
        </div>
      )}

      {/* Step 1: Consent Verified Indicator (READ-ONLY) */}
      {showConsentVerified && (
        <div className="mt-5 rounded-xl border border-[#cfe9d6] bg-[#f3fff6] p-4">
          <div className="text-sm font-semibold">
            {t("consent.verified.title", "Parental consent verified ✅")}
          </div>
          <div className="mt-1 text-sm text-[var(--text-muted)]">
            {t(
              "consent.verified.body",
              "Your guardian consent is verified. You can continue using the platform."
            )}
          </div>
        </div>
      )}

{/* Dashboard KPI Summary */}
{studentId && !loading && !error && dashboard && (
  <div className="mt-6 rounded-xl border border-[var(--border)] bg-white p-4">
    <div className="flex flex-wrap gap-6">
      <div>
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold">
          {t("student.dashboard.kpi.assessments", "Assessments")}
        </div>
        <div className="mt-1 text-2xl font-bold">
          {dashboard.assessment_kpis?.total_assessments ?? 0}
        </div>
      </div>
      <div>
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold">
          {t("student.dashboard.kpi.lastSubmitted", "Last submitted:")}
        </div>
        <div className="mt-1 text-sm font-medium">
          {dashboard.assessment_kpis?.last_submitted_at
            ? new Date(dashboard.assessment_kpis.last_submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : t("student.dashboard.kpi.notYet", "Not yet")}
        </div>
      </div>
    </div>

    {Array.isArray(dashboard.top_skills) && dashboard.top_skills.length > 0 && (
      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold mb-3">
          {t("student.dashboard.kpi.scoring", "Your top strengths")}
        </div>
        <div className="flex flex-wrap gap-2">
          {dashboard.top_skills.slice(0, 5).map((s) => (
            <span
              key={s.skill_id}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-app)] px-3 py-1 text-xs font-medium"
            >
              {s.skill_name || `Skill ${s.skill_id}`}
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
)}

{studentId && loading && (
  <div className="mt-6 rounded-xl border border-[var(--border)] bg-white p-4 text-sm">
    {t("student.dashboard.loading", "Loading dashboard data…")}
  </div>
)}

      {/* Action cards */}
      <div className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate("/student/onboarding")}
            className="rounded-xl border border-[var(--border)] bg-white p-4 text-left transition hover:shadow-sm"
          >
            <div className="text-sm font-semibold">
              {t("student.dashboard.card.onboarding.title", "Onboarding / Context")}
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {t(
                "student.dashboard.card.onboarding.body",
                "Add optional context to improve recommendations."
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/student/assessment")}
            className="rounded-xl border border-[var(--border)] bg-white p-4 text-left transition hover:shadow-sm"
          >
            <div className="text-sm font-semibold">
              {t("student.dashboard.card.assessment.title", "Start / Resume Assessment")}
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {t(
                "student.dashboard.card.assessment.body",
                "Continue your assessment journey."
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/student/results/latest")}
            className="rounded-xl border border-[var(--border)] bg-white p-4 text-left transition hover:shadow-sm"
          >
            <div className="text-sm font-semibold">
              {t("student.dashboard.card.latestResults.title", "View Latest Results")}
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {t(
                "student.dashboard.card.latestResults.body",
                "See your latest career recommendations."
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/student/results/history")}
            className="rounded-xl border border-[var(--border)] bg-white p-4 text-left transition hover:shadow-sm"
          >
            <div className="text-sm font-semibold">
              {t("student.dashboard.card.history.title", "Results History")}
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {t(
                "student.dashboard.card.history.body",
                "View all your previous submissions."
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!studentId) return navigate("/student/consent");
              navigate(`/student/reports/${studentId}`);
            }}
            className="rounded-xl border border-[var(--border)] bg-white p-4 text-left transition hover:shadow-sm"
          >
            <div className="text-sm font-semibold">
              {t("student.dashboard.card.report.title", "Report (placeholder)")}
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {t(
                "student.dashboard.card.report.body",
                "Downloadable report experience (coming soon)."
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/student/careers/1")}
            className="rounded-xl border border-[var(--border)] bg-white p-4 text-left transition hover:shadow-sm"
          >
            <div className="text-sm font-semibold">
              {t("student.dashboard.card.careerDetail.title", "Career Detail (placeholder)")}
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {t(
                "student.dashboard.card.careerDetail.body",
                "Deep dive into a career explanation (coming soon)."
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/student/consent")}
            className="rounded-xl border border-[var(--border)] bg-white p-4 text-left transition hover:shadow-sm"
          >
            <div className="text-sm font-semibold">
              {t("student.dashboard.card.consent.title", "Consent (if minor)")}
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {t(
                "student.dashboard.card.consent.body",
                "Verify guardian consent if required."
              )}
            </div>
          </button>
        </div>

        <div className="mt-4">
          <Link
            to="/"
            className="text-sm text-[var(--brand-primary)] hover:underline"
          >
            {t("nav.backHome", "← Home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
