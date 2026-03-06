// src/pages/StudentDashboardPage.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import Button from "../ui/Button";
import { useSession } from "../hooks/useSession";
import DebugPanel from "../components/dev/DebugPanel";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import { t } from "../i18n";

import {
  getStudentDashboard,
  getStudentAssessments,
  getStudentResults,
} from "../api/students";

export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const { logout, sessionUser } = useSession();

  // IMPORTANT: We need a stable studentId. Adjust only if your /v1/auth/me payload uses a different field.
const studentId = useMemo(() => {
  // Backend currently returns student_profile=null for many users.
  // In our current data model, we treat sessionUser.id as the student identifier
  // for /v1/students/{id}/* endpoints (until we implement a separate student_profile table).
  return sessionUser?.student_profile?.student_id ?? sessionUser?.id ?? null;
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
  // DEV ONLY DEBUG FLAG
  const showDebug = import.meta.env.DEV;

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
          "Failed to load dashboard data.";

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
  {showDebug && (
    <DebugPanel
      title="Student Dashboard API Debug"
      data={{
        studentId,
        dashboard,
        assessments,
        results,
      }}
    />
  )}
  // Mini dashboard summary (reuse already-fetched API data; no new calls)
  const miniSummary = useMemo(() => {
    const kpis = dashboard?.assessment_kpis || null;

    const totalAssessments =
      (typeof kpis?.total_assessments === "number" ? kpis.total_assessments : null) ??
      (typeof assessments?.total_assessments === "number" ? assessments.total_assessments : 0);

    const lastSubmittedAt =
      (typeof kpis?.last_submitted_at === "string" ? kpis.last_submitted_at : null) ?? null;

    const scoringConfigVersion =
      (typeof dashboard?.scoring_config_version === "string"
        ? dashboard.scoring_config_version
        : null) ?? null;

    const resultsCount = Array.isArray(results) ? results.length : null;

    const tier = (sessionUser?.tier || "").toString().trim().toLowerCase() || "free";
    const role = (sessionUser?.role || "").toString().trim().toLowerCase() || "student";

    return {
      tier,
      role,
      totalAssessments,
      lastSubmittedAt,
      scoringConfigVersion,
      resultsCount,
    };
  }, [dashboard, assessments, results, sessionUser]);  

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
              ? `${t("student.dashboard.welcomePrefix", "Welcome,")} ${sessionUser.full_name}. ${t(
                  "student.dashboard.chooseNext",
                  "Choose what you want to do next."
                )}`
              : t("student.dashboard.chooseNext", "Choose what you want to do next.")}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <LanguageSwitcher compact />
          <Button onClick={logout}>
            {t("common.logout", "Logout")}
          </Button>
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

      {/* Read-only data section (temporary but extremely useful for schema validation) */}
      <div className="mt-6">
        {!studentId && (
          <div className="rounded-xl border border-[var(--border)] bg-white p-4">
            <div className="text-sm font-semibold">
              {t("student.dashboard.session.title", "Session")}
            </div>
            <div className="mt-2 text-sm text-[var(--text-muted)]">
              {t("student.dashboard.session.cannotDeterminePrefix", "Could not determine")}{" "}
              <code>studentId</code> {t("student.dashboard.session.cannotDetermineFrom", "from")}{" "}
              <code>sessionUser</code>.
              <br />
              {t(
                "student.dashboard.session.shareMePayload",
                "Please share your /v1/auth/me payload field name for the student id."
              )}
            </div>
          </div>
        )}

        {studentId && loading && (
          <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm">
            {t("student.dashboard.loading", "Loading dashboard data…")}
          </div>
        )}

        {studentId && error && (
          <div className="rounded-xl border border-[#f3b4b4] bg-[#fff6f6] p-4">
            <div className="text-sm font-semibold">
              {t("student.dashboard.errorTitle", "Failed to load dashboard data")}
              {error.status ? ` (HTTP ${error.status})` : ""}
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {error.message}
            </div>
            <div className="mt-3">
              <Button variant="secondary" onClick={() => window.location.reload()}>
                {t("common.retry", "Retry")}
              </Button>
            </div>
          </div>
        )}

        {studentId && !loading && !error && (
          <div className="mt-1 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-white p-4">
              <div className="text-xs text-[var(--text-muted)]">
                {t("student.dashboard.kpi.account", "Account")}
              </div>
              <div className="mt-1 text-sm font-semibold capitalize">
                {miniSummary.role} • {miniSummary.tier}
              </div>
              <div className="mt-2 text-xs text-[var(--text-muted)]">
                {miniSummary.tier === "premium"
                  ? t("student.dashboard.kpi.premiumEnabled", "Premium analytics enabled")
                  : t("student.dashboard.kpi.freeTier", "Free tier (upgrade for premium analytics)")}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-white p-4">
              <div className="text-xs text-[var(--text-muted)]">
                {t("student.dashboard.kpi.assessments", "Assessments")}
              </div>
              <div className="mt-1 text-sm font-semibold">
                {miniSummary.totalAssessments ?? 0} {t("student.dashboard.kpi.total", "total")}
              </div>
              <div className="mt-2 text-xs text-[var(--text-muted)]">
               {t("student.dashboard.kpi.lastSubmitted", "Last submitted:")}{" "}
                {miniSummary.lastSubmittedAt
                  ? new Date(miniSummary.lastSubmittedAt).toLocaleString()
                  : t("student.dashboard.kpi.notYet", "Not yet")}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-white p-4">
              <div className="text-xs text-[var(--text-muted)]">
                {t("student.dashboard.kpi.scoring", "Scoring")}
              </div>
              <div className="mt-1 text-sm font-semibold">
                {t("student.dashboard.kpi.version", "Version:")}{" "}
                {miniSummary.scoringConfigVersion || "—"}
              </div>
              <div className="mt-2 text-xs text-[var(--text-muted)]">
                {t("student.dashboard.kpi.resultsHistory", "Results history:")}{" "}
                {typeof miniSummary.resultsCount === "number"
                  ? `${miniSummary.resultsCount} ${t("student.dashboard.kpi.records", "record(s)")}`
                  : "—"}
              </div>
            </div>
          </div>
        )}
      </div>

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
              {t("student.dashboard.card.onboarding.body", "Add optional context to improve recommendations.")}
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
              {t("student.dashboard.card.assessment.body", "Continue your assessment journey.")}
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
              {t("student.dashboard.card.latestResults.body", "See your latest career recommendations.")}
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
              {t("student.dashboard.card.history.body", "View all your previous submissions.")}
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
              {t("student.dashboard.card.report.title", "Report")}
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              Downloadable report experience (coming soon).
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/student/careers/1")}
            className="rounded-xl border border-[var(--border)] bg-white p-4 text-left transition hover:shadow-sm"
          >
            <div className="text-sm font-semibold">
              {t("student.dashboard.card.careerDetail.title", "Career Detail")}
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              Deep dive into a career explanation (coming soon).
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
              Verify guardian consent if required.
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
