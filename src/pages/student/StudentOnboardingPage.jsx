// src/pages/student/StudentOnboardingPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import { useSession } from "../../hooks/useSession";
import { useContent } from "../../locales/LanguageProvider";

const DRAFT_KEY = "__STUDENT_ONBOARDING_DRAFT_V1__";
const MOBILE_BREAKPOINT_PX = 640;

const DEFAULT_DRAFT = {
  grade: "",
  primary_goal: "",
  interests: "",
  preferred_countries: "",
  constraints: "",
};

const getFields = (t) => [
  {
    key: "grade",
    label: t("student.onboarding.gradeClass", "Grade / Class"),
    required: true,
    placeholder: t("student.onboarding.placeholder.grade", "e.g. 9"),
    help: t("student.onboarding.help.grade", "Used to tailor recommendations to your academic stage."),
  },
  {
    key: "primary_goal",
    label: t("student.onboarding.primaryGoal", "Primary Goal"),
    required: true,
    placeholder: t("student.onboarding.placeholder.primaryGoal", "e.g. choose a stream, explore careers, plan higher studies"),
    help: t("student.onboarding.help.primaryGoal", "Tell us what outcome you want from this assessment."),
  },
  {
    key: "interests",
    label: t("student.onboarding.interests", "Interests"),
    required: false,
    placeholder: t("student.onboarding.placeholder.interests", "e.g. coding, biology, art, public speaking"),
    help: t("student.onboarding.help.interests", "Optional — helps personalize the report later."),
  },
  {
    key: "preferred_countries",
    label: t("student.onboarding.preferredCountries", "Preferred Countries"),
    required: false,
    placeholder: t("student.onboarding.placeholder.preferredCountries", "e.g. India, UK, US"),
    help: t("student.onboarding.help.preferredCountries", "Optional — relevant for education/career pathways."),
  },
  {
    key: "constraints",
    label: t("student.onboarding.constraints", "Constraints"),
    required: false,
    placeholder: t("student.onboarding.placeholder.constraints", "e.g. budget, location, academics"),
    help: t("student.onboarding.help.constraints", "Optional — helps keep recommendations realistic."),
  },
];

export default function StudentOnboardingPage() {
  const navigate = useNavigate();
  const { logout, sessionUser } = useSession();
  const { t } = useContent();
  const FIELDS = useMemo(() => getFields(t), [t]);

  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [touched, setTouched] = useState(false);

  // Mobile stepper state
  const [isMobile, setIsMobile] = useState(false);
  const [step, setStep] = useState(0);

  /* ---------------- Mobile detection (<= 640px) ---------------- */
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);

    function apply(e) {
      setIsMobile(Boolean(e.matches));
    }

    // initial
    apply(mq);

    // subscribe
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    } else {
      // older browsers
      mq.addListener(apply);
      return () => mq.removeListener(apply);
    }
  }, []);

  /* ---------------- Load draft (UI-only) ---------------- */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setDraft({ ...DEFAULT_DRAFT, ...parsed });
    } catch {
      // ignore invalid draft
    }
  }, []);

  /* ---------------- Persist draft ---------------- */
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // ignore storage errors
    }
  }, [draft]);

  const isValid = useMemo(() => {
    return Boolean(draft.grade.trim()) && Boolean(draft.primary_goal.trim());
  }, [draft]);

  function updateField(key) {
    return (e) => {
      setTouched(true);
      setDraft((d) => ({ ...d, [key]: e.target.value }));
    };
  }

  function handleContinue() {
    setTouched(true);
    if (!isValid) return;
    navigate("/student/assessment");
  }

  function handleClearDraft() {
    sessionStorage.removeItem(DRAFT_KEY);
    setDraft(DEFAULT_DRAFT);
    setTouched(false);
    setStep(0);
  }

  /* ---------------- Stepper helpers ---------------- */
  const currentField = FIELDS[step];

  const stepIsValid = useMemo(() => {
    if (!currentField) return true;
    if (!currentField.required) return true;
    return Boolean(String(draft[currentField.key] ?? "").trim());
  }, [currentField, draft]);

  function goNext() {
    setTouched(true);

    // If required field is missing, block next
    if (!stepIsValid) return;

    if (step < FIELDS.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    // Last step → continue (requires overall validity)
    handleContinue();
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
    else navigate("/student/dashboard");
  }

  /* ---------------- Render: Mobile stepper ---------------- */
  function renderMobileStepper() {
    return (
      <div style={{ maxWidth: 520, display: "grid", gap: 14 }}>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {t("student.onboarding.stepPrefix", "Step")} {step + 1} {t("student.onboarding.stepOf", "of")} {FIELDS.length}
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
            {currentField.label}{" "}
            {currentField.required ? (
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                ({t("student.onboarding.required", "required")})
              </span>
            ) : (
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                ({t("student.onboarding.optional", "optional")})
              </span>
            )}
          </div>

          <Input
            value={draft[currentField.key]}
            onChange={updateField(currentField.key)}
            placeholder={currentField.placeholder}
          />

          {currentField.help ? (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
              {currentField.help}
            </div>
          ) : null}

          {touched && !stepIsValid ? (
            <div
              role="alert"
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #f0c36d",
                background: "#fff9ef",
                fontSize: 13,
              }}
            >
              {t("student.onboarding.validation.requiredField", "Please complete this required field to continue.")}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={goBack}>
            {t("student.onboarding.actions.back", "Back")}
          </Button>

          <Button onClick={goNext} disabled={!stepIsValid}>
            {step < FIELDS.length - 1
              ? t("student.onboarding.actions.next", "Next")
              : t("student.onboarding.actions.saveContinue", "Save & Continue")}
          </Button>

          <Button variant="secondary" onClick={handleClearDraft}>
            {t("student.onboarding.actions.clearDraft", "Clear Draft")}
          </Button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {t("student.onboarding.draftStored", "Draft is stored locally (sessionStorage). Backend save will be added later.")}
        </div>
      </div>
    );
  }

  /* ---------------- Render: Desktop full form ---------------- */
  function renderDesktopForm() {
    return (
      <div style={{ maxWidth: 640, display: "grid", gap: 14 }}>
        {/* Grade */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            {t("student.onboarding.gradeClass", "Grade / Class")}{" "}
            <span style={{ opacity: 0.7 }}>
              ({t("student.onboarding.required", "required")})
            </span>
          </div>
          <Input
            value={draft.grade}
            onChange={updateField("grade")}
            placeholder={t("student.onboarding.placeholder.grade", "e.g. 9")}
          />
        </div>

        {/* Primary goal */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            {t("student.onboarding.primaryGoal", "Primary Goal")}{" "}
            <span style={{ opacity: 0.7 }}>
              ({t("student.onboarding.required", "required")})
            </span>
          </div>
          <Input
            value={draft.primary_goal}
            onChange={updateField("primary_goal")}
            placeholder={t("student.onboarding.placeholder.primaryGoal", "e.g. choose a stream, explore careers, plan higher studies")}
          />
        </div>

        {/* Interests */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            {t("student.onboarding.interests", "Interests")} ({t("student.onboarding.optional", "optional")})
          </div>
          <Input
            value={draft.interests}
            onChange={updateField("interests")}
            placeholder={t("student.onboarding.placeholder.interests", "e.g. coding, biology, art, public speaking")}
          />
        </div>

        {/* Preferred countries */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            {t("student.onboarding.preferredCountries", "Preferred Countries")} ({t("student.onboarding.optional", "optional")})
          </div>
          <Input
            value={draft.preferred_countries}
            onChange={updateField("preferred_countries")}
            placeholder={t("student.onboarding.placeholder.preferredCountries", "e.g. India, UK, US")}
          />
        </div>

        {/* Constraints */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            {t("student.onboarding.constraints", "Constraints")} ({t("student.onboarding.optional", "optional")})
          </div>
          <Input
            value={draft.constraints}
            onChange={updateField("constraints")}
            placeholder={t("student.onboarding.placeholder.constraints", "e.g. budget, location, academics")}
          />
        </div>

        {/* Validation message */}
        {touched && !isValid ? (
          <div
            role="alert"
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #f0c36d",
              background: "#fff9ef",
              fontSize: 13,
            }}
          >
            {t("student.onboarding.validation.prefix", "Please complete the required fields:")}{" "}
            <b>{t("student.onboarding.validation.grade", "Grade")}</b>{" "}
            {t("student.onboarding.validation.and", "and")}{" "}
            <b>{t("student.onboarding.validation.primaryGoal", "Primary Goal")}</b>.
          </div>
        ) : null}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button onClick={handleContinue} disabled={!isValid}>
            {t("student.onboarding.actions.saveContinue", "Save & Continue")}
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate("/student/dashboard")}
          >
            {t("student.onboarding.actions.backToDashboard", "Back to Dashboard")}
          </Button>

          <Button variant="secondary" onClick={handleClearDraft}>
            {t("student.onboarding.actions.clearDraft", "Clear Draft")}
          </Button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {t("student.onboarding.draftStored", "Draft is stored locally (sessionStorage). Backend save will be added later.")}
        </div>
      </div>
    );
  }

  return (
    <SkeletonPage
      title={t("student.onboarding.title", "Student Onboarding")}
      subtitle={
        sessionUser?.full_name
          ? t("student.onboarding.subtitleNamed", "Hi {{name}}, tell us a bit about yourself before starting the assessment.", { name: sessionUser.full_name })
          : t("student.onboarding.subtitleDefault", "Tell us a bit about your background and context.")
      }
      actions={<Button onClick={logout}>{t("student.onboarding.actions.logout", "Logout")}</Button>}
    >
      {isMobile ? renderMobileStepper() : renderDesktopForm()}
    </SkeletonPage>
  );
}
