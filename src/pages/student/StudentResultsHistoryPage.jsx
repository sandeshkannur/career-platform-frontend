import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../apiClient";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import { useSession } from "../../hooks/useSession";
import { useContent } from "../../locales/LanguageProvider";

export default function StudentResultsHistoryPage() {
  const navigate = useNavigate();
  const { sessionUser } = useSession();
  const { t } = useContent();

  // Backend-authoritative student identity:
  // Resolve student_id via /v1/students/students/me (NOT via auth/me student_profile).
  const [studentId, setStudentId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  async function resolveStudentId() {
    // Only attempt after session exists (prevents noisy calls before auth state is ready)
    if (!sessionUser) return;

    try {
      const meStudent = await apiGet(`/v1/students/students/me`);
      setStudentId(meStudent?.id ?? null);
    } catch (e) {
      setStudentId(null);
      setError(e?.message || t("student.resultsHistory.errors.studentProfileNotReady", "Student profile not ready."));
      setLoading(false);
    }
  }

  async function loadHistory() {
    if (!studentId) {
      setError(t("student.resultsHistory.errors.studentNotReady", "Student not ready"));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      // openapi shows /v1/students/{id}/assessments
      const res = await apiGet(`/v1/students/${studentId}/assessments`);
      setItems(Array.isArray(res?.assessments) ? res.assessments : []);
    } catch (e) {
      setError(e?.message || t("student.resultsHistory.errors.couldNotLoadHistory", "Could not load history."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    resolveStudentId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser]);

  useEffect(() => {
    if (studentId) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  return (
    <SkeletonPage
      title={t("student.resultsHistory.title", "Results History")}
      subtitle={t("student.resultsHistory.subtitle", "Previous assessments and recommendations.")}
    >
      <div className="flex gap-2 justify-end">
        <Button onClick={() => navigate("/student/results/latest")}>
          {t("student.resultsHistory.actions.backToLatest", "Back to Latest")}
        </Button>
        <Button variant="secondary" disabled>
          {t("student.resultsHistory.actions.downloadReport", "Download Report")}
        </Button>
      </div>

      {loading ? (
        <p>{t("student.resultsHistory.loading", "Loading history…")}</p>
      ) : error ? (
        <div className="card">
          <h3>{t("student.resultsHistory.error.title", "Student not ready")}</h3>
          <p>{error}</p>
          <Button onClick={() => {
            setLoading(true);
            setError("");
            resolveStudentId();
          }}>
            {t("student.resultsHistory.actions.retry", "Retry")}
          </Button>
        </div>
      ) : (
        <div className="card">
          {items.length === 0 ? (
            <p>{t("student.resultsHistory.empty", "No assessments found yet.")}</p>
          ) : (
            <div className="space-y-2">
              {items.map((a) => (
                <div key={a.assessment_id} className="card">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">
                        {t("student.resultsHistory.row.assessmentPrefix", "Assessment")} #{a.assessment_id}
                      </div>
                      <div className="text-sm text-muted">
                        {t("student.resultsHistory.row.submitted", "Submitted")}:{" "}
                        {a.submitted_at
                          ? new Date(a.submitted_at).toLocaleString()
                          : t("student.resultsHistory.row.notAvailable", "—")}
                      </div>
                      <div className="text-sm text-muted">
                        {t("student.resultsHistory.row.config", "Config")}:{" "}
                        {a.scoring_config_version ?? t("student.resultsHistory.row.notAvailable", "—")}
                      </div>
                    </div>

                    <Button
                      onClick={() =>
                        navigate(`/student/results/latest?assessmentId=${a.assessment_id}`)
                      }
                    >
                      {t("student.resultsHistory.actions.view", "View")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SkeletonPage>
  );
}
