// frontend/src/pages/student/StudentContextPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import { apiGet, apiPut  } from "../../apiClient";
import { useSession } from "../../hooks/useSession";
import { useContent } from "../../locales/LanguageProvider";

/**
 * StudentContextPage
 * - Optional "quick check-in" for context that improves scoring quality.
 * - Calm, non-intimidating wording, mobile-friendly.
 * - Does NOT block assessment flow.
 */
export default function StudentContextPage() {
  const navigate = useNavigate();
  const { sessionUser } = useSession();
  const { t } = useContent();

  // We pin student_id from the student_profile (now present after student row creation).
  const studentId = useMemo(() => {
    return sessionUser?.student_profile?.student_id ?? null;
  }, [sessionUser]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Very small form, with friendly defaults.
  const [form, setForm] = useState({
    ses_band: "unknown",
    education_board: "unknown",
    support_level: "unknown",
    resource_access: "unknown",
  });

  // Fetch latest active assessment so we can attach context to the right run
  const [activeAssessmentId, setActiveAssessmentId] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        // If student not ready, send them back
        if (!studentId) {
          setError(
            t(
              "student.context.errors.profileNotReadyReturn",
              "Student profile not ready yet. Please return to Dashboard."
            )
          );
          return;
        }

        const active = await apiGet("/v1/assessments/active");
        if (!alive) return;

        // /v1/assessments/active returns an object with assessment_id (per your logs)
        const assessmentId = active?.assessment_id ?? null;
        setActiveAssessmentId(assessmentId);

        // Optional: If backend already has context for this assessment,
        // we could prefill by reading it. If no read endpoint exists, we skip.
        // (Keeping minimal: do not add new backend endpoints.)
      } catch (e) {
        setError(
          e?.message ||
            t(
              "student.context.errors.loadState",
              "Could not load your assessment state. Please try again."
            )
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [studentId]);

  function setField(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function onSave() {
    if (!studentId) {
      setError(
        t("student.context.errors.profileNotReady", "Student profile not ready yet.")
      );
      return;
    }
    if (!activeAssessmentId) {
      setError(
        t(
          "student.context.errors.noActiveAssessment",
          "No active assessment found. Start an assessment first."
        )
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      // Create Context Profile (CPS) for this assessment (immutable 1:1 on backend)
      // Backend already ensures a row exists; posting again should be safe only if your endpoint is idempotent.
      // If your endpoint is "create-only", we can change this to "POST only when unknown".
      
      await apiPut(`/v1/assessments/${activeAssessmentId}/context-profile`, {
        ses_band: form.ses_band,
        education_board: form.education_board,
        support_level: form.support_level,
        resource_access: form.resource_access,
        });

      // Store a local "completed" marker so we don't nag too often in dev
      localStorage.setItem("cp_context_completed", "1");

      // Return the user where they came from (assessment intro is most common)
      navigate("/student/assessment");
    } catch (e) {
      setError(
        e?.message ||
          t(
            "student.context.errors.saveFailed",
            "We couldn't save these details right now. You can continue the assessment and try again later."
          )
      );
    } finally {
      setSaving(false);
    }
  }
  // Small, local chip group for mobile-friendly selection
function ChipGroup({ value, onChange, options }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt.value;

        return (
          <Button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              borderRadius: 9999,          // pill
              padding: "10px 14px",        // consistent with your Button padding
              minHeight: 40,               // mobile tap target
              border: selected ? "1px solid #111" : "1px solid #ddd",
              background: selected ? "#111" : "#fff",
              color: selected ? "#fff" : "#111",
            }}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}

  return (
    <SkeletonPage
      title={t("student.context.title", "Quick check-in (optional)")}
      subtitle={t(
        "student.context.subtitle",
        "These details help us keep recommendations practical for you. You can skip and update later."
      )}
    >
      <div className="card">
        {loading ? (
          <p>{t("student.context.loading", "Loading…")}</p>
        ) : error ? (
          <div className="text-sm">
            <p className="text-red-600">{error}</p>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => navigate("/student/dashboard")}>
                {t("student.context.actions.backToDashboard", "Back to Dashboard")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-4">
              {t("student.context.intro.takesAboutPrefix", "Takes about")}{" "}
              <strong>{t("student.context.intro.seconds", "30 seconds")}</strong>
              . {t("student.context.intro.preferNotToSay", "Choose “Prefer not to say” anytime.")}
            </p>

            <div className="flex flex-col space-y-8">
              <div>
                <label className="block text-sm font-semibold mb-3 leading-relaxed">
                  {t("student.context.q.educationBoard", "Which board are you studying under?")}
                </label>

                <div className="mt-4"></div>
                <ChipGroup
                    value={form.education_board}
                    onChange={(val) => setField("education_board", val)}
                    options={[
                        { value: "cbse", label: t("student.context.options.educationBoard.cbse", "CBSE") },
                        { value: "icse", label: t("student.context.options.educationBoard.icse", "ICSE") },
                        { value: "state", label: t("student.context.options.educationBoard.state", "State Board") },
                        { value: "ib", label: t("student.context.options.educationBoard.ib", "IB") },
                        { value: "cambridge", label: t("student.context.options.educationBoard.cambridge", "Cambridge / IGCSE") },
                        { value: "other", label: t("student.context.options.common.other", "Other") },
                        { value: "unknown", label: t("student.context.options.common.preferNotToSay", "Prefer not to say") },
                    ]}
                    />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 leading-relaxed">
                  {t(
                    "student.context.q.supportLevel",
                    "When you need study help, how much support is usually available?"
                  )}
                </label>
                <ChipGroup
                    value={form.support_level}
                    onChange={(val) => setField("support_level", val)}
                    options={[
                        { value: "low", label: t("student.context.options.supportLevel.low", "Mostly self-supported") },
                        { value: "medium", label: t("student.context.options.supportLevel.medium", "Some guidance available") },
                        { value: "high", label: t("student.context.options.supportLevel.high", "Strong support available") },
                        { value: "unknown", label: t("student.context.options.common.preferNotToSay", "Prefer not to say") },
                    ]}
                    />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 leading-relaxed">
                  {t(
                    "student.context.q.resourceAccess",
                    "How easy is it to access learning resources if needed (internet/books/coaching)?"
                  )}
                </label>
                <div className="mt-4">
                    <ChipGroup
                        value={form.resource_access}
                        onChange={(val) => setField("resource_access", val)}
                        options={[
                        { value: "limited", label: t("student.context.options.resourceAccess.limited", "Limited") },
                        { value: "moderate", label: t("student.context.options.resourceAccess.moderate", "Moderate") },
                        { value: "good", label: t("student.context.options.resourceAccess.good", "Good") },
                        { value: "unknown", label: t("student.context.options.common.preferNotToSay", "Prefer not to say") },
                        ]}
                    />
                    </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 leading-relaxed">
                  {t(
                    "student.context.q.sesBand",
                    "To keep suggestions practical, which feels closest?"
                  )}
                </label>
                <div className="mt-4">
                    <ChipGroup
                        value={form.ses_band}
                        onChange={(val) => setField("ses_band", val)}
                        options={[
                        { value: "careful", label: t("student.context.options.sesBand.careful", "Careful with expenses") },
                        { value: "some", label: t("student.context.options.sesBand.some", "Can manage some extra learning costs") },
                        { value: "not_barrier", label: t("student.context.options.sesBand.notBarrier", "Costs usually not a big barrier") },
                        { value: "unknown", label: t("student.context.options.common.preferNotToSay", "Prefer not to say") },
                        ]}
                    />
                    </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => navigate("/student/assessment")}>
                {t("student.context.actions.skipForNow", "Skip for now")}
              </Button>
              <Button onClick={onSave} disabled={saving}>
                {saving
                  ? t("student.context.actions.saving", "Saving…")
                  : t("student.context.actions.save", "Save")}
              </Button>
            </div>
          </>
        )}
      </div>
    </SkeletonPage>
  );
}
