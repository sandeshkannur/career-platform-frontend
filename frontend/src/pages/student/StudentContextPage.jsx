// frontend/src/pages/student/StudentContextPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import { apiGet, apiPut  } from "../../apiClient";
import { useSession } from "../../hooks/useSession";
import useContent from "../../hooks/useContent";

/**
 * StudentContextPage
 * - Optional "quick check-in" for context that improves scoring quality.
 * - Calm, non-intimidating wording, mobile-friendly.
 * - Does NOT block assessment flow.
 */
export default function StudentContextPage() {
  const navigate = useNavigate();
  const { sessionUser } = useSession();
  const { t } = useContent("student.context");

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
          setError("Student profile not ready yet. Please return to Dashboard.");
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
        setError(e?.message || "Could not load your assessment state. Please try again.");
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
      setError("Student profile not ready yet.");
      return;
    }
    if (!activeAssessmentId) {
      setError("No active assessment found. Start an assessment first.");
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
          "We couldn't save these details right now. You can continue the assessment and try again later."
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
      title="Quick check-in (optional)"
      subtitle="These details help us keep recommendations practical for you. You can skip and update later."
    >
      <div className="card">
        {loading ? (
          <p>{t("loading", "Loading…")}</p>
        ) : error ? (
          <div className="text-sm">
            <p className="text-red-600">{error}</p>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => navigate("/student/dashboard")}>
                {t("actions.backToDashboard", "Back to Dashboard")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-4">
              {t("intro.takesAboutPrefix", "Takes about")}{" "}
              <strong>{t("intro.seconds", "30 seconds")}</strong>.{" "}
              {t("intro.preferNotToSay", "Choose “Prefer not to say” anytime.")}
            </p>

            <div className="flex flex-col space-y-8">
              <div>
                <label className="block text-sm font-semibold mb-3 leading-relaxed">
                  {t("q.educationBoard", "Which board are you studying under?")}
                </label>

                <div className="mt-4"></div>
                <ChipGroup
                    value={form.education_board}
                    onChange={(val) => setField("education_board", val)}
                    options={[
                        { value: "cbse", label: "CBSE" },
                        { value: "icse", label: "ICSE" },
                        { value: "state", label: "State Board" },
                        { value: "ib", label: "IB" },
                        { value: "cambridge", label: "Cambridge / IGCSE" },
                        { value: "other", label: "Other" },
                        { value: "unknown", label: "Prefer not to say" },
                    ]}
                    />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 leading-relaxed">{t(
                            "q.supportLevel",
                            "When you need study help, how much support is usually available?"
                          )}</label>
                <ChipGroup
                    value={form.support_level}
                    onChange={(val) => setField("support_level", val)}
                    options={[
                        { value: "low", label: "Mostly self-supported" },
                        { value: "medium", label: "Some guidance available" },
                        { value: "high", label: "Strong support available" },
                        { value: "unknown", label: "Prefer not to say" },
                    ]}
                    />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 leading-relaxed">{t(
                                          "q.resourceAccess",
                                          "How easy is it to access learning resources if needed (internet/books/coaching)?"
                                        )}</label>
                <div className="mt-4">
                    <ChipGroup
                        value={form.resource_access}
                        onChange={(val) => setField("resource_access", val)}
                        options={[
                        { value: "limited", label: "Limited" },
                        { value: "moderate", label: "Moderate" },
                        { value: "good", label: "Good" },
                        { value: "unknown", label: "Prefer not to say" },
                        ]}
                    />
                    </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 leading-relaxed">{t("q.sesBand", "To keep suggestions practical, which feels closest?")}</label>
                <div className="mt-4">
                    <ChipGroup
                        value={form.ses_band}
                        onChange={(val) => setField("ses_band", val)}
                        options={[
                        { value: "careful", label: "Careful with expenses" },
                        { value: "some", label: "Can manage some extra learning costs" },
                        { value: "not_barrier", label: "Costs usually not a big barrier" },
                        { value: "unknown", label: "Prefer not to say" },
                        ]}
                    />
                    </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => navigate("/student/assessment")}>
                Skip for now
              </Button>
              <Button onClick={onSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </>
        )}
      </div>
    </SkeletonPage>
  );
}
