// src/pages/SignupPage.jsx
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Page from "../ui/Page";
import Card from "../ui/Card";
import AuthHeader from "../ui/AuthHeader";
import useContent from "../hooks/useContent";
import Input from "../ui/Input";
import Button from "../ui/Button";

export default function SignupPage() {
  const navigate = useNavigate();
  const { t } = useContent("auth.signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [grade, setGrade] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");

  const canSubmit = useMemo(() => {
    return (
      String(fullName).trim().length >= 2 &&
      String(email).includes("@") &&
      String(password).length >= 8 &&
      String(dob).trim().length > 0 &&
      String(grade).trim().length > 0
    );
  }, [fullName, email, password, dob, grade]);

async function onSubmit(e) {
  e.preventDefault();

  try {
    const res = await fetch("https://api.mapyourcareer.in/v1/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        full_name: fullName,
        email: email,
        password: password,
        dob: dob,
        grade: parseInt(grade),
        guardian_email: guardianEmail || null
      })
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.detail || t("auth.signup.alert.failed", "Signup failed"));
      return;
    }

    alert(t("auth.signup.alert.success", "Signup successful. Please login."));
    navigate("/login", { replace: true });

  } catch (err) {
    console.error(err);
    alert(t("auth.signup.alert.networkError", "Network error during signup"));
  }
}

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Page maxWidth="920px">
        <div className="mx-auto grid min-h-screen items-center gap-10 py-10 md:grid-cols-[1fr_420px]">
          <div className="hidden md:block">
            <AuthHeader variant="minimal" />
            <div className="mt-6 space-y-2">
              <h1 className="text-2xl font-semibold text-[var(--text)]">
                {t("auth.signup.headline", "Create your account")}
              </h1>
              <p className="text-sm text-[var(--text-muted)]">
                {t("auth.signup.blurb", "Create your account to get started.")}
              </p>
            </div>
          </div>

          <div className="w-full max-w-[420px] justify-self-center md:justify-self-end">
            <div className="md:hidden">
              <AuthHeader variant="minimal" />
            </div>

            <Card>
              <div className="space-y-1">
                <h1 className="m-0 text-xl font-semibold text-[var(--text)]">
                  {t("auth.signup.title", "Signup")}
                </h1>
                <p className="text-sm text-[var(--text-muted)]">
                  {t("auth.signup.subtitle", "Create an account to continue.")}
                </p>
              </div>

              <form onSubmit={onSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)]">
                    {t("auth.signup.fullNameLabel", "Full name")}
                  </label>
                  <div className="mt-2">
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t("auth.signup.fullNamePlaceholder", "Your name")}
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text)]">
                    {t("auth.signup.emailLabel", "Email")}
                  </label>
                  <div className="mt-2">
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("auth.signup.emailPlaceholder", "you@example.com")}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text)]">
                    {t("auth.signup.passwordLabel", "Password")}
                  </label>
                  <div className="mt-2">
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("auth.signup.passwordPlaceholder", "Min 8 characters")}
                      type="password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)]">
                    {t("auth.signup.dobLabel", "Date of Birth")}
                  </label>
                  <div className="mt-2">
                    <Input
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      type="date"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text)]">
                    {t("auth.signup.gradeLabel", "Grade")}
                  </label>
                  <div className="mt-2">
                    <Input
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      type="number"
                      min="1"
                      max="12"
                      placeholder={t("auth.signup.gradePlaceholder", "Enter your grade")}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text)]">
                    {t("auth.signup.guardianEmailLabel", "Guardian Email")}
                  </label>
                  <div className="mt-2">
                    <Input
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                      type="email"
                      placeholder={t("auth.signup.guardianEmailPlaceholder", "parent@example.com")}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={!canSubmit} style={{ width: "100%" }}>
                  {t("auth.signup.submit", "Create account")}
                </Button>

                <div className="text-sm text-[var(--text-muted)]">
                  {t("auth.signup.alreadyHave", "Already have an account?")}{" "}
                  <Link className="text-[var(--brand)] hover:underline" to="/login">
                    {t("auth.signup.loginLink", "Login")}
                  </Link>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--text-muted)]">
                  {t("auth.signup.note", "Use your details to create a student account. Guardian email is required for minors.")}
                </div>
              </form>
            </Card>
          </div>
        </div>
      </Page>
    </div>
  );
}
