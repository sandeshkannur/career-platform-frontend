// src/pages/student/StudentAssessmentSubmitPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import { useContent } from "../../locales/LanguageProvider";

import { getAssessment, postAssessmentResponses, submitAssessment } from "../../api/assessments";

const DRAFT_PREFIX_V2 = "__ASSESSMENT_RUN_DRAFT_V2__";
const QUESTION_COUNT = 50;
function toLikertCode(value) {
  // Backend expects "1".."5"
  // UI draft currently stores labels like "Agree"
  const v = String(value || "").trim().toLowerCase();

  if (v === "strongly disagree") return "1";
  if (v === "disagree") return "2";
  if (v === "neutral") return "3";
  if (v === "agree") return "4";
  if (v === "strongly agree") return "5";

  // If already numeric "1".."5", pass through
  if (/^[1-5]$/.test(v)) return v;

  return null;
}
function readDraft(storageKey) {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function StudentAssessmentSubmitPage() {
  const navigate = useNavigate();
  const { attemptId } = useParams();
  const { t } = useContent();

  const storageKey = useMemo(() => {
    return `${DRAFT_PREFIX_V2}:${attemptId || "unknown"}`;
  }, [attemptId]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [serverQuestionIds, setServerQuestionIds] = useState([]);

  // Read once per render (draft is autosaved on run page)
  const draft = useMemo(() => readDraft(storageKey), [storageKey]);
    useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!attemptId) return;

      try {
        const a = await getAssessment(attemptId);

        // Expecting { question_ids: [...] } from backend
        const ids = Array.isArray(a?.question_ids) ? a.question_ids : [];

        if (!cancelled) setServerQuestionIds(ids);
      } catch (e) {
        // Don't hard fail here; draft may still exist
        if (!cancelled) {
          setError(
            e?.detail ||
              e?.message ||
              t("student.assessmentSubmit.errors.loadAssessment", "Failed to load assessment from server.")
          );
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  const questionIds = serverQuestionIds.length
    ? serverQuestionIds
    : Array.isArray(draft?.question_ids)
      ? draft.question_ids
      : [];
  const answersObj = draft?.answers && typeof draft.answers === "object" ? draft.answers : {};

  const answeredCount = useMemo(() => {
    return questionIds.reduce((acc, qid) => {
      const a = answersObj?.[qid]?.answer;
      return acc + (typeof a === "string" && a ? 1 : 0);
    }, 0);
  }, [questionIds, answersObj]);

  const missingCount = Math.max(0, questionIds.length - answeredCount);

  const canSubmit =
    Boolean(attemptId) &&
    questionIds.length === QUESTION_COUNT &&
    answeredCount === QUESTION_COUNT &&
    !busy;

  const handleBack = useCallback(() => {
    navigate(`/student/assessment/run/${attemptId || "unknown"}`, { replace: true });
  }, [navigate, attemptId]);

  const handleConfirmSubmit = useCallback(async () => {
    setError(null);

    if (!attemptId) {
      setError(t("student.assessmentSubmit.errors.missingAttemptId", "Missing attempt id. Please restart the assessment."));
      return;
    }

    if (!draft) {
      setError(
        t(
          "student.assessmentSubmit.errors.noDraft",
          "No saved draft found for this assessment. Please return and answer the questions."
        )
      );
      return;
    }

    if (questionIds.length !== QUESTION_COUNT) {
      setError(
        t(
          "student.assessmentSubmit.errors.invalidQuestionSet",
          "Invalid question set. Expected {{expected}} questions but found {{found}}. Please return to the assessment run.",
          { expected: QUESTION_COUNT, found: questionIds.length }
        )
      );
      return;
    }

    if (answeredCount !== QUESTION_COUNT) {
      setError(
        t(
          "student.assessmentSubmit.errors.incomplete",
          "Assessment incomplete. Answered {{answered}}/{{total}}. Please return and complete all questions.",
          { answered: answeredCount, total: QUESTION_COUNT }
        )
      );
      return;
    }

    const responses = questionIds.map((qid) => {
      const code = toLikertCode(answersObj?.[qid]?.answer);

      return {
        question_id: qid,
        answer: code,
        idempotency_key: `attempt:${attemptId}:q:${qid}`,
      };
    });

    const invalid = responses.find((r) => !r.answer);
    if (invalid) {
      setError(
        t(
          "student.assessmentSubmit.errors.invalidAnswer",
          "Invalid answer value for question_id={{questionId}}. Please go back and reselect the option.",
          { questionId: invalid.question_id }
        )
      );
      return;
    }

    setBusy(true);
    try {
      // 2) Persist responses first (backend authoritative)
      await postAssessmentResponses(attemptId, responses);

      // 3) Then trigger scoring / finalization
      await submitAssessment(attemptId, {});

      // Clear local draft on success
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // ignore storage failures
      }

      // Navigate to latest results page (PR6 will render backend results)
      navigate("/student/results/latest", { replace: true });
    } catch (e) {
      setError(
        e?.detail ||
          e?.message ||
          t("student.assessmentSubmit.errors.submitFailed", "Submit failed. Please try again.")
      );
    } finally {
      setBusy(false);
    }
  }, [attemptId, draft, questionIds, answeredCount, answersObj, navigate, storageKey]);

  // Friendly empty/invalid states
  const invalidDraft =
    !draft ||
    !attemptId ||
    questionIds.length !== QUESTION_COUNT;

  return (
    <SkeletonPage
      title={t("student.assessmentSubmit.title", "Submit Assessment")}
      subtitle={t("student.assessmentSubmit.subtitle", "Review completion status before submitting.")}
      actions={
        <>
          <Button variant="secondary" onClick={handleBack} disabled={busy}>
            {t("student.assessmentSubmit.actions.back", "Back")}
          </Button>
          <Button onClick={handleConfirmSubmit} disabled={!canSubmit}>
            {busy
              ? t("student.assessmentSubmit.actions.submitting", "Submitting...")
              : t("student.assessmentSubmit.actions.confirmSubmit", "Confirm & Submit")}
          </Button>
        </>
      }
      empty={invalidDraft}
      emptyTitle={t("student.assessmentSubmit.emptyTitle", "Nothing to submit yet")}
      emptyDescription={t(
        "student.assessmentSubmit.emptyDescription",
        "Return to the assessment run and complete all questions before submitting."
      )}
    >
      <div style={{ maxWidth: 720, display: "grid", gap: 14 }}>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          {t("student.assessmentSubmit.attemptId", "Attempt ID")}: <b>{attemptId || t("student.assessmentSubmit.unknown", "unknown")}</b>
        </div>

        <div style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 12, background: "#fff" }}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>
            {t("student.assessmentSubmit.summary.title", "Completion summary")}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: "var(--text-muted)" }}>
              {t("student.assessmentSubmit.summary.answered", "Answered")}
            </span>
            <span style={{ fontWeight: 700 }}>
              {answeredCount} / {QUESTION_COUNT}
              {missingCount > 0 && (
                <span style={{ marginLeft: 8, color: "var(--error-text)", fontWeight: 500 }}>
                  ({missingCount} {t("student.assessmentSubmit.summary.missing", "missing")})
                </span>
              )}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "var(--bg-app)", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.round((answeredCount / QUESTION_COUNT) * 100)}%`,
              background: answeredCount === QUESTION_COUNT ? "var(--success-text)" : "var(--brand-primary)",
              borderRadius: 999,
              transition: "width 0.3s ease",
            }} />
          </div>
          {answeredCount === QUESTION_COUNT && (
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--success-text)", fontWeight: 600 }}>
              ✓ {t("student.assessmentSubmit.summary.allAnswered", "All questions answered — ready to submit!")}
            </div>
          )}
        </div>

        {error ? (
          <div
            role="alert"
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid var(--error-border)",
              background: "var(--error-bg)",
              fontSize: 13,
              color: "var(--error-text)",
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 12, background: "#fff" }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
            {t("student.assessmentSubmit.whatsNext.title", "What happens next")}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {[
              t("student.assessmentSubmit.whatsNext.step1", "Your 60 responses are sent securely to the scoring engine."),
              t("student.assessmentSubmit.whatsNext.step2", "Career recommendations are generated based on your personality profile."),
              t("student.assessmentSubmit.whatsNext.step3", "You'll land on your Results page instantly — no waiting."),
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{
                  minWidth: 22, height: 22, borderRadius: "50%",
                  background: "var(--brand-tint)", color: "var(--brand-primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, paddingTop: 2, color: "var(--text-muted)" }}>{step}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}

