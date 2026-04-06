// src/pages/student/StudentAssessmentRunPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";


import Button from "../../ui/Button";
import { useContent } from "../../locales/LanguageProvider";

import { getAssessmentQuestions, postAssessmentResponses } from "../../api/assessments";
import { loadAnswerQueue, replayAnswerQueueOnce } from "../../lib/replayQueue";
import QuestionRenderer from "../../components/assessment/QuestionRenderer";
import { apiPost } from "../../apiClient";
import { useSession } from "../../hooks/useSession";

const DRAFT_PREFIX_V2 = "__ASSESSMENT_RUN_DRAFT_V2__";
const DRAFT_PREFIX_V1 = "__ASSESSMENT_RUN_DRAFT_V1__"; // legacy (migration only)
const DRAFT_SCHEMA_VERSION = 2;

const QUESTION_COUNT = 50;

// ─── Interest Inventory (Chapter 5 — Q51-Q60) ────────────────────────────
const INTEREST_QUESTIONS = [
  { id: "q1",  opts: ["a", "b", "c"] },
  { id: "q2",  opts: ["a", "b", "c"] },
  { id: "q3",  opts: ["a", "b", "c"] },
  { id: "q4",  opts: ["a", "b", "c"] },
  { id: "q5",  opts: ["a", "b", "c"] },
  { id: "q6",  opts: ["a", "b", "c"] },
  { id: "q7",  opts: ["a", "b", "c"] },
  { id: "q8",  opts: ["a", "b", "c"] },
  { id: "q9",  opts: ["a", "b", "c"] },
  { id: "q10", opts: ["a", "b", "c"] },
];

// Phases: "psychometric" | "ch5_intro" | "interest" | "submitting"

const CHAPTER_BREAKS = [
  { afterIndex: 17, from: "ch1", to: "ch2" },
  { afterIndex: 35, from: "ch2", to: "ch3" },
  { afterIndex: 45, from: "ch3", to: "ch4" },
];

const MILESTONES = { 8: "q9", 26: "q18", 40: "q27", 47: "q36" };

function AssessmentIntroScreen({ onContinue, t }) {
  return (
    <div className="mx-auto w-full max-w-lg px-6 py-12">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
        {t("student.assessmentChapters.intro.title")}
      </h1>
      <p className="text-[var(--text-muted)] mb-6">
        {t("student.assessmentChapters.intro.body")}
      </p>
      <ul className="space-y-3 mb-6">
        {["rule1", "rule2", "rule3", "rule4"].map((r) => (
          <li key={r} className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>{t(`student.assessmentChapters.intro.${r}`)}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-[var(--text-muted)] mb-8">
        {t("student.assessmentChapters.intro.time")}
      </p>
      <button
        onClick={onContinue}
        className="w-full rounded-xl bg-[var(--brand-primary,#1d4ed8)] px-6 py-3 text-white font-semibold hover:opacity-90 transition"
      >
        {t("student.assessmentChapters.intro.cta")}
      </button>
    </div>
  );
}

/**
 * Assessment Runner (PR4)
 * - Loads question pool from backend
 * - Deterministically selects 75 questions based on attemptId
 * - Stores a local draft in sessionStorage using a versioned schema (V2)
 * - Draft is refresh-safe and can migrate legacy V1 drafts
 *
 * NOTE:
 * - Backend owns scoring. Frontend stores answers only.
 * - No submit wiring in PR4.
 */
export default function StudentAssessmentRunPage() {
  const navigate = useNavigate();
  const { attemptId } = useParams();



  const storageKey = useMemo(() => {
    return `${DRAFT_PREFIX_V2}:${attemptId || "unknown"}`;
  }, [attemptId]);

  const legacyStorageKey = useMemo(() => {
    return `${DRAFT_PREFIX_V1}:${attemptId || "unknown"}`;
  }, [attemptId]);

  const [index, setIndex] = useState(0);
  const { t, language, setLanguage } = useContent();
  const [showIntro, setShowIntro] = useState(true);
  const lang = language || "en";

  // answers: { [questionId]: { answer: string, answered_at: ISOString } }
  const [answers, setAnswers] = useState({});

  // loaded = we attempted to load any stored draft (or decided none exists)
  const [loaded, setLoaded] = useState(false);

  // Prevent autosave from overwriting storage before we load/migrate draft
  const didLoadDraftRef = useRef(false);

  const [serverQuestions, setServerQuestions] = useState([]);
  const [questionsError, setQuestionsError] = useState(null);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);

  // A+ (auto-replay on open) — small, neutral UX signal
  const [syncState, setSyncState] = useState({ status: "idle", message: "" });
  const [chapterBreak, setChapterBreak] = useState(null);
  const [milestone, setMilestone] = useState(null);
  const didAutoReplayRef = useRef(false);

  // Chapter 5 — Interest Inventory state
  const [phase, setPhase] = useState("psychometric"); // "psychometric"|"ch5_intro"|"interest"|"submitting"
  const [interestIndex, setInterestIndex] = useState(0);
  const [interestAnswers, setInterestAnswers] = useState({});
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  const [interestError, setInterestError] = useState("");

  const { sessionUser } = useSession();
  const studentId = sessionUser?.student_profile?.student_id ?? null;

  /* ---------------- Load questions from assessment API (single source of truth) ---------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      if (!attemptId || attemptId === "unknown") return;
      setQuestionsLoaded(false);
      setQuestionsError(null);

      try {
        const data = await getAssessmentQuestions(attemptId, lang);
        const questions = Array.isArray(data?.questions) ? data.questions : [];
        if (!cancelled) {
          setServerQuestions(questions);
          setQuestionsLoaded(true);
        }
      } catch (e) {
        if (!cancelled) {
          setQuestionsError(e);
          setQuestionsLoaded(true);
        }
      }
    }

    loadQuestions();
    return () => {
      cancelled = true;
    };
  }, [attemptId, lang]);

  const QUESTIONS = useMemo(() => serverQuestions, [serverQuestions]);

  const selectedQuestionIds = useMemo(
    () => serverQuestions.map((q) => String(q.question_id || q.id || "")),
    [serverQuestions]
  );

  const current = QUESTIONS[index];

  /* ---------------- Draft load / migration ---------------- */
  useEffect(() => {
    function clampIndex(i, len) {
      if (typeof i !== "number" || Number.isNaN(i)) return 0;
      if (i < 0) return 0;
      if (len <= 0) return 0;
      return Math.min(i, len - 1);
    }

    function isPlainObject(v) {
      return Boolean(v) && typeof v === "object" && !Array.isArray(v);
    }

    function normalizeV2(parsed) {
      const now = new Date().toISOString();

      const safeAnswers = isPlainObject(parsed?.answers) ? parsed.answers : {};
      const normalizedAnswers = {};

      Object.keys(safeAnswers).forEach((qid) => {
        const entry = safeAnswers[qid];

        // tolerate accidental legacy string value inside V2
        if (typeof entry === "string" && entry) {
          normalizedAnswers[qid] = { answer: entry, answered_at: now };
          return;
        }

        if (
          isPlainObject(entry) &&
          typeof entry.answer === "string" &&
          entry.answer
        ) {
          normalizedAnswers[qid] = {
            answer: entry.answer,
            answered_at:
              typeof entry.answered_at === "string" ? entry.answered_at : now,
          };
        }
      });

      const qids =
        Array.isArray(parsed?.question_ids) && parsed.question_ids.length
          ? parsed.question_ids.filter(Boolean)
          : selectedQuestionIds;

      return {
        schema_version: DRAFT_SCHEMA_VERSION,
        assessment_id: attemptId || "unknown",
        question_ids: qids,
        index: clampIndex(parsed?.index ?? 0, qids.length),
        answers: normalizedAnswers,
        created_at:
          typeof parsed?.created_at === "string" ? parsed.created_at : now,
        updated_at: now,
      };
    }

    function migrateV1ToV2(v1) {
      // V1 shape: { index, answers: { [qid]: optionText }, savedAt }
      const now = new Date().toISOString();

      const v1Answers = isPlainObject(v1?.answers) ? v1.answers : {};
      const nextAnswers = {};

      Object.keys(v1Answers).forEach((qid) => {
        const val = v1Answers[qid];
        if (typeof val === "string" && val) {
          nextAnswers[qid] = {
            answer: val,
            answered_at: typeof v1?.savedAt === "string" ? v1.savedAt : now,
          };
        }
      });

      return {
        schema_version: DRAFT_SCHEMA_VERSION,
        assessment_id: attemptId || "unknown",
        question_ids: selectedQuestionIds,
        index: clampIndex(v1?.index ?? 0, selectedQuestionIds.length),
        answers: nextAnswers,
        created_at: now,
        updated_at: now,
      };
    }

    try {
      // Prefer V2
      const rawV2 = sessionStorage.getItem(storageKey);
      if (rawV2) {
        const parsed = JSON.parse(rawV2);
        const draft = normalizeV2(parsed);

        setIndex(draft.index);
        setAnswers(draft.answers);

        // Normalize persisted form (best-effort)
        sessionStorage.setItem(storageKey, JSON.stringify(draft));

        setLoaded(true);
        didLoadDraftRef.current = true;
        return;
      }

      // Fallback: migrate legacy V1 -> V2 (one-time)
      const rawV1 = sessionStorage.getItem(legacyStorageKey);
      if (rawV1) {
        const parsedV1 = JSON.parse(rawV1);
        const draft = migrateV1ToV2(parsedV1);

        setIndex(draft.index);
        setAnswers(draft.answers);

        sessionStorage.setItem(storageKey, JSON.stringify(draft));

        setLoaded(true);
        didLoadDraftRef.current = true;
        return;
      }

      setLoaded(true);
      didLoadDraftRef.current = true;
    } catch {
      setLoaded(true);
      didLoadDraftRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, legacyStorageKey, attemptId, selectedQuestionIds.length]);

  /* ---------------- A+ Auto-replay on open (resume) ---------------- */
  useEffect(() => {
    // Run once per mount only
    if (didAutoReplayRef.current) return;

    // Need an assessment id to submit to
    if (!attemptId || attemptId === "unknown") return;

    // Only try when online (offline should not spam errors)
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    // Only try if we have something queued
    const q = loadAnswerQueue();
    if (!Array.isArray(q) || q.length === 0) return;

    didAutoReplayRef.current = true;

    (async () => {
      try {
        setSyncState({
          status: "syncing",
          message: t("student.assessmentRun.sync.syncing", "Syncing saved answers…"),
        });

        const res = await replayAnswerQueueOnce(attemptId);

        if (res?.ok) {
          // We do NOT clear queue here (by design). Clearing is handled later after verification.
          console.log("[A+ auto-replay] submitted:", res.submitted, res.server);
          setSyncState({
            status: "done",
            message:
              res.submitted > 0
                ? t(
                    "student.assessmentRun.sync.syncedCount",
                    "Synced {{count}} saved answer(s).",
                    { count: res.submitted }
                  )
                : t("student.assessmentRun.sync.none", "No saved answers to sync."),
          });
        } else {
          console.warn("[A+ auto-replay] not submitted:", res);
          setSyncState({
            status: "error",
            message:
              res?.message ||
              t(
                "student.assessmentRun.sync.failed",
                "Could not sync saved answers automatically. You can continue normally."
              ),
          });
        }
      } catch (e) {
        console.warn("[A+ auto-replay] error:", e);
        setSyncState({
          status: "error",
          message: t(
            "student.assessmentRun.sync.failed",
            "Could not sync saved answers automatically. You can continue normally."
          ),
        });
      }
    })();
  }, [attemptId]);

  /* ---------------- Autosave draft on change ---------------- */
  useEffect(() => {
    if (!didLoadDraftRef.current) return;
    if (!selectedQuestionIds.length) return;

    try {
      const now = new Date().toISOString();

      // Preserve created_at if present
      let createdAt = now;
      const existingRaw = sessionStorage.getItem(storageKey);
      if (existingRaw) {
        try {
          const existing = JSON.parse(existingRaw);
          if (typeof existing?.created_at === "string")
            createdAt = existing.created_at;
        } catch {
          // ignore
        }
      }

      const draft = {
        schema_version: DRAFT_SCHEMA_VERSION,
        assessment_id: attemptId || "unknown",
        question_ids: selectedQuestionIds,
        index,
        answers,
        created_at: createdAt,
        updated_at: now,
      };

      sessionStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      // ignore storage errors (private mode / quotas)
    }
  }, [answers, index, selectedQuestionIds, attemptId, storageKey]);

  /* ---------------- Helpers for rendering ---------------- */
  const currentId =
    current?.question_id ?? current?.id ?? current?.questionId ?? null;

  const currentText = current?.question_text || current?.text || current?.prompt || "";

  const currentOptions = Array.isArray(current?.response_options) ? current.response_options : [];
  const selected = currentId ? answers[currentId]?.answer : null;
  const isLast = index === QUESTIONS.length - 1;

  function choose(option) {
    if (!currentId) return;
    const now = new Date().toISOString();
    setAnswers((a) => ({
      ...a,
      [currentId]: { answer: option, answered_at: now },
    }));
  }

  function handleBack() {
    if (index > 0) {
      setIndex((i) => i - 1);
      return;
    }
    navigate("/student/assessment", { replace: true });
  }

  function handleSave() {
    try {
      // Autosave already persists; Save is an explicit user action.
      const now = new Date().toISOString();

      // Preserve created_at if present
      let createdAt = now;
      const existingRaw = sessionStorage.getItem(storageKey);
      if (existingRaw) {
        try {
          const existing = JSON.parse(existingRaw);
          if (typeof existing?.created_at === "string")
            createdAt = existing.created_at;
        } catch {
          // ignore
        }
      }

      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          schema_version: DRAFT_SCHEMA_VERSION,
          assessment_id: attemptId || "unknown",
          question_ids: selectedQuestionIds,
          index,
          answers,
          created_at: createdAt,
          updated_at: now,
        })
      );
      alert(t("student.assessmentRun.alerts.saved", "Progress saved (local draft)."));
    } catch {
      alert(
        t(
          "student.assessmentRun.alerts.saveFailed",
          "Unable to save progress in this browser/session."
        )
      );
    }
  }

  function handleNext() {
    if (!selected) return;
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    // Q50 complete — go to Chapter 5 intro instead of submit page
    setPhase("ch5_intro");
  }

  function handleLangChange(e) {
    setLanguage(e.target.value);
  }

  function handleInterestSelect(qId, opt) {
    setInterestAnswers(prev => ({ ...prev, [qId]: opt }));
  }

  function handleInterestNext() {
    const currentIQ = INTEREST_QUESTIONS[interestIndex];
    if (!interestAnswers[currentIQ.id]) return;
    if (interestIndex < INTEREST_QUESTIONS.length - 1) {
      setInterestIndex(i => i + 1);
      return;
    }
    // All 10 interest questions answered → submit both
    handleFinalSubmit();
  }

  function handleInterestBack() {
    if (interestIndex > 0) {
      setInterestIndex(i => i - 1);
    } else {
      // Back from first interest Q → back to Ch5 intro
      setPhase("ch5_intro");
    }
  }

  async function handleFinalSubmit() {
    setPhase("submitting");
    setInterestError("");

    // 1) POST interest answers to /v1/interest/{studentId} (non-blocking — best effort)
    if (studentId && Object.keys(interestAnswers).length > 0) {
      try {
        await apiPost(`/v1/interest/${studentId}`, {
          answers: interestAnswers,
          lang: lang || "en",
        });
      } catch {
        // Interest submit failure is non-fatal — psychometric results still valid
      }
    }

    // 2) Navigate to psychometric submit page (existing flow)
    navigate(`/student/assessment/submit/${attemptId || "unknown"}`);
  }

  // ─── Chapter 5 intro screen ──────────────────────────────────────────────
  if (phase === "ch5_intro") {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">
              {t("student.assessmentRun.title", "Assessment")}
            </h1>
          </div>
          <Button variant="secondary" onClick={() => setPhase("psychometric")}>
            {t("student.assessmentRun.actions.back", "Back")}
          </Button>
        </div>

        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-[var(--text-muted)]">
            <span>{t("student.assessmentChapters.ch5.progressLabel", "Chapter 5 of 5")}</span>
            <span>50 / 60</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--border)]">
            <div className="h-2 rounded-full bg-[var(--brand-primary)]" style={{ width: "83%" }} />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            {t("student.assessmentChapters.ch5.label", "Chapter 5")}
          </div>
          <h2 className="mb-3 text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
            {t("student.assessmentChapters.ch5.title", "What do you enjoy?")}
          </h2>
          <p className="mb-5 text-sm leading-relaxed text-[var(--text-muted)]">
            {t(
              "student.assessmentChapters.ch5.intro",
              "This final chapter has 10 short activity questions. There are no right or wrong answers — simply pick what feels most natural to you. This helps us understand which career worlds genuinely excite you."
            )}
          </p>

          <div className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--bg-app)] p-4">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {t("student.assessmentChapters.ch5.whyLabel", "Why this matters")}
            </div>
            <p className="text-sm text-[var(--text-primary)]">
              {t(
                "student.assessmentChapters.ch5.why",
                "Research shows that measuring both traits and interests together is 2× more accurate at predicting career satisfaction than traits alone. Your answers here personalise your career matches."
              )}
            </p>
          </div>

          <p className="mb-6 text-sm text-[var(--text-muted)]">
            {t("student.assessmentChapters.ch5.instructions", "10 questions · 2–3 minutes · Pick one option per question")}
          </p>

          <Button
            onClick={() => setPhase("interest")}
            style={{ background: "var(--brand-primary)", color: "#fff", border: "none", padding: "11px 24px", fontSize: 14 }}
          >
            {t("student.assessmentChapters.ch5.cta", "Start Chapter 5 →")}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Interest questions (Q51–Q60) ────────────────────────────────────────
  if (phase === "interest" || phase === "submitting") {
    const iq = INTEREST_QUESTIONS[interestIndex];
    const iqSelected = interestAnswers[iq?.id];
    const isLastIQ = interestIndex === INTEREST_QUESTIONS.length - 1;
    const currentQNum = 50 + interestIndex + 1;
    const pct = Math.round((currentQNum / 60) * 100);

    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        {/* Header — language only */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">
              {t("student.assessmentRun.title", "Assessment")}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {t("student.assessmentChapters.ch5.title", "What do you enjoy?")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <select
              value={lang}
              onChange={handleLangChange}
              className="h-9 rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
            >
              <option value="en">{t("common.language.en", "EN")}</option>
              <option value="kn">{t("common.language.kn", "KN")}</option>
            </select>
          </div>
        </div>

        {/* Progress — Q51–Q60 out of 60 */}
        <div className="mt-6">
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <div>
              {t("student.assessmentRun.progress.question", "Question")}{" "}
              <span className="font-medium text-[var(--text-primary)]">{currentQNum}</span>{" "}
              {t("student.assessmentRun.progress.of", "of")}{" "}
              <span className="font-medium text-[var(--text-primary)]">60</span>
              <span className="ml-2 opacity-70">
                · {t("student.assessmentChapters.ch5.label", "Chapter 5")}
              </span>
            </div>
            <div>{pct}%</div>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--border)]">
            <div
              className="h-2 rounded-full bg-[var(--brand-primary)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-6">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {t("interest.question", "Question")} {interestIndex + 1} {t("interest.of", "of")} 10
          </div>
          <div className="mb-2 text-lg font-semibold leading-snug">
            {t(`interest.${iq.id}.text`, `Activity question ${interestIndex + 1}`)}
          </div>
          <div className="mb-5 text-sm text-[var(--text-muted)]">
            {t(`interest.${iq.id}.sub`, "Pick what feels most natural to you")}
          </div>

          <div className="grid gap-3">
            {iq.opts.map((opt) => {
              const label = t(`interest.${iq.id}.${opt}`, `Option ${opt.toUpperCase()}`);
              const active = iqSelected === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleInterestSelect(iq.id, opt)}
                  disabled={phase === "submitting"}
                  className={[
                    "w-full rounded-xl border px-4 py-3 text-left text-sm transition hover:shadow-sm",
                    active
                      ? "border-[var(--brand-primary)] bg-[var(--bg-app)]"
                      : "border-[var(--border)] bg-white",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  <span className="font-medium text-[var(--text-primary)]">{label}</span>
                </button>
              );
            })}
          </div>

          {!iqSelected && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-[#f0c36d] bg-[#fff9ef] p-3 text-sm"
            >
              <div className="font-semibold">
                {t("student.assessmentRun.helper.select_title", "Select an option to continue")}
              </div>
              <div className="mt-1 text-[var(--text-muted)]">
                {t("student.assessmentRun.helper.select_body", "You can change your answer anytime before submitting.")}
              </div>
            </div>
          )}

          {/* Bottom nav — ONLY place with Next/Submit */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
            <Button variant="secondary" onClick={handleInterestBack}>
              {t("student.assessmentRun.actions.back", "Back")}
            </Button>
            <span className="text-xs text-[var(--text-muted)]">
              {Object.keys(interestAnswers).length}/10 {t("interest.nav.answered", "answered")}
            </span>
            <Button
              onClick={handleInterestNext}
              disabled={!iqSelected || phase === "submitting"}
              style={
                iqSelected && phase !== "submitting"
                  ? { background: "var(--brand-primary)", color: "#fff", border: "none" }
                  : {}
              }
            >
              {phase === "submitting"
                ? t("interest.nav.submitting", "Submitting…")
                : isLastIQ
                ? t("student.assessmentRun.actions.submit", "Submit →")
                : t("student.assessmentRun.actions.next", "Next →")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading / error states ───────────────────────────────────────────────
  const stillLoading =
    !questionsLoaded ||
    !loaded ||
    (!serverQuestions.length && !questionsError && attemptId && attemptId !== "unknown");

  if (stillLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">
              {t("student.assessmentRun.title", "Assessment")}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {t("student.assessmentRun.loading.subtitle", "Loading your assessment…")}
            </p>
          </div>
          <div className="shrink-0">
            <Button variant="secondary" onClick={() => navigate("/student/assessment")}>
              {t("student.assessmentRun.actions.back", "Back")}
            </Button>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-white p-4 text-sm">
          {t("student.assessmentRun.loading.body", "Loading…")}
        </div>
      </div>
    );
  }

  if (questionsError) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">
              {t("student.assessmentRun.title", "Assessment")}
            </h1>
          </div>
          <Button variant="secondary" onClick={() => navigate("/student/assessment")}>
            {t("student.assessmentRun.actions.back", "Back")}
          </Button>
        </div>
        <div className="mt-6 rounded-xl border border-[#f3b4b4] bg-[#fff6f6] p-4">
          <div className="text-sm font-semibold">
            {t("student.assessmentRun.error.title", "Failed to load questions")}
          </div>
          <div className="mt-1 text-sm text-[var(--text-muted)]">
            {questionsError?.message || t("student.assessmentRun.error.fallback", "Failed to load questions.")}
          </div>
        </div>
      </div>
    );
  }

  if (!current || !currentId) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          {t("student.assessmentRun.empty.body", "Unable to load questions.")}
        </div>
      </div>
    );
  }

  // ─── Psychometric questions (Q1–Q50) ─────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">

      {showIntro && (
        <AssessmentIntroScreen
          onContinue={() => setShowIntro(false)}
          t={t}
        />
      )}

      {!showIntro && (
        <>
          {/* Header — Back + Save + Language. NO Next/Submit here. */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold">
                {t("student.assessmentRun.title", "Assessment")}
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {t("student.assessmentRun.subtitle", "Answer honestly. There are no right or wrong answers.")}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <select
                value={lang}
                onChange={handleLangChange}
                className="h-9 rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
                aria-label={t("student.assessmentRun.language.ariaLabel", "Language")}
              >
                <option value="en">{t("common.language.en", "EN")}</option>
                <option value="kn">{t("common.language.kn", "KN")}</option>
              </select>
              <Button variant="secondary" onClick={handleSave}>
                {t("student.assessmentRun.actions.save", "Save")}
              </Button>
            </div>
          </div>

          {/* Progress — shows X/60 total */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <div>
                {t("student.assessmentRun.progress.question", "Question")}{" "}
                <span className="font-medium text-[var(--text-primary)]">{index + 1}</span>{" "}
                {t("student.assessmentRun.progress.of", "of")}{" "}
                <span className="font-medium text-[var(--text-primary)]">60</span>
              </div>
              <div>{Math.round(((index + 1) / 60) * 100)}%</div>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-[var(--border)]">
              <div
                className="h-2 rounded-full bg-[var(--brand-primary)] transition-all"
                style={{ width: `${Math.round(((index + 1) / 60) * 100)}%` }}
              />
            </div>
            {syncState.status !== "idle" ? (
              <div className="mt-2 text-xs text-[var(--text-muted)]">{syncState.message}</div>
            ) : null}
          </div>

          {/* Question Card */}
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-6">
            <div className="text-lg font-semibold leading-snug">{currentText}</div>
            <div className="mt-4">
              <QuestionRenderer
                question={{
                  ...current,
                  question_type: current?.question_type || "likert",
                  question_text: currentText,
                  response_options: currentOptions,
                  renderer_config: current?.renderer_config || null,
                  lang_used: lang,
                }}
                selected={selected}
                onChoose={(value) => choose(value)}
              />
            </div>

            {!selected && (
              <div role="alert" className="mt-4 rounded-xl border border-[#f0c36d] bg-[#fff9ef] p-3 text-sm">
                <div className="font-semibold">
                  {t("student.assessmentRun.helper.select_title", "Select an option to continue")}
                </div>
                <div className="mt-1 text-[var(--text-muted)]">
                  {t("student.assessmentRun.helper.select_body", "You can change your answer anytime before submitting.")}
                </div>
              </div>
            )}

            {/* Bottom nav — Next/Continue ONLY here, never in header */}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
              <Button variant="secondary" onClick={handleBack}>
                {t("student.assessmentRun.actions.back", "Back")}
              </Button>
              <span className="text-xs text-[var(--text-muted)]">
                {index + 1} / 60
              </span>
              <Button
                onClick={handleNext}
                disabled={!selected}
                style={
                  selected
                    ? { background: "var(--brand-primary)", color: "#fff", border: "none" }
                    : {}
                }
              >
                {isLast
                  ? t("student.assessmentChapters.ch5.cta", "Continue to Chapter 5 →")
                  : t("student.assessmentRun.actions.next", "Next →")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

