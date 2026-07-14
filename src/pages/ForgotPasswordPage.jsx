// src/pages/ForgotPasswordPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import Page from "../ui/Page";
import Card from "../ui/Card";
import AuthHeader from "../ui/AuthHeader";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { useContent } from "../locales/LanguageProvider";

/**
 * Public flow (no session token yet) — uses raw fetch instead of apiClient,
 * matching GuardianVerifyPage's precedent: apiClient's 401 handling triggers
 * a hard-logout redirect that would be wrong here.
 */
function buildApiUrl(path) {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  return `${base}${path}`;
}

export default function ForgotPasswordPage() {
  const { t } = useContent();

  const [channel, setChannel] = useState("email"); // "email" | "mobile"
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function switchChannel(next) {
    setChannel(next);
    setError("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (channel === "email" && !email.trim()) {
      setError(t("auth.forgotPassword.errors.missingEmail", "Enter your email address."));
      return;
    }
    if (channel === "mobile" && !phone.trim()) {
      setError(t("auth.forgotPassword.errors.missingPhone", "Enter your phone number."));
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        channel,
        identifier: channel === "email" ? email.trim() : phone.trim(),
      };

      const res = await fetch(buildApiUrl("/v1/auth/forgot-password/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // Always show the same generic success state regardless of response
      // details — mirrors the backend's own privacy design of not revealing
      // whether an account exists.
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.detail || data?.message || t("auth.forgotPassword.errors.failed", "Something went wrong. Please try again."));
      }
    } catch {
      setError(t("auth.forgotPassword.errors.failed", "Something went wrong. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Page maxWidth="920px">
        <div className="mx-auto grid min-h-screen items-center gap-10 py-10 md:grid-cols-[1fr_420px]">
          <div className="hidden md:block">
            <AuthHeader variant="minimal" />
          </div>

          <div className="w-full max-w-[420px] justify-self-center md:justify-self-end">
            <div className="md:hidden">
              <AuthHeader variant="minimal" />
            </div>

            <Card>
              <div className="space-y-1">
                <h1 className="m-0 text-xl font-semibold text-[var(--text)]">
                  {t("auth.forgotPassword.title", "Forgot password")}
                </h1>
                <p className="text-sm text-[var(--text-muted)]">
                  {t("auth.forgotPassword.subtitle", "We'll send you a link to reset your password.")}
                </p>
              </div>

              {submitted ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800">
                    <div className="font-semibold">{t("auth.forgotPassword.success.title", "Check your inbox")}</div>
                    <p className="mt-1">
                      {channel === "email"
                        ? t("auth.forgotPassword.success.bodyEmail", "If an account exists for this email, we've sent a link to reset your password.")
                        : t("auth.forgotPassword.success.bodyMobile", "If an account exists for this number, we've sent an SMS with a link to reset your password.")}
                    </p>
                  </div>

                  <div className="text-sm text-[var(--text-muted)]">
                    {t("auth.forgotPassword.success.cta", "Already have a code or link?")}{" "}
                    <Link className="text-[var(--brand)] hover:underline" to="/reset-password">
                      {t("auth.forgotPassword.success.gotoVerify", "Enter it here")}
                    </Link>
                  </div>

                  <div className="pt-2">
                    <Link className="text-sm text-[var(--text-muted)] hover:underline" to="/login">
                      {t("auth.forgotPassword.backToLogin", "Back to login")}
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-4 flex gap-2 rounded-lg border border-[var(--border)] p-1">
                    <button
                      type="button"
                      onClick={() => switchChannel("email")}
                      className={
                        channel === "email"
                          ? "flex-1 rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white"
                          : "flex-1 rounded-md px-3 py-2 text-sm font-medium text-[var(--text-muted)]"
                      }
                      style={{ minHeight: 40 }}
                    >
                      {t("auth.forgotPassword.modeEmail", "Email")}
                    </button>
                    <button
                      type="button"
                      onClick={() => switchChannel("mobile")}
                      className={
                        channel === "mobile"
                          ? "flex-1 rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white"
                          : "flex-1 rounded-md px-3 py-2 text-sm font-medium text-[var(--text-muted)]"
                      }
                      style={{ minHeight: 40 }}
                    >
                      {t("auth.forgotPassword.modeMobile", "Mobile")}
                    </button>
                  </div>

                  <form onSubmit={onSubmit} className="mt-5 space-y-4">
                    {channel === "email" ? (
                      <div>
                        <label className="block text-sm font-medium text-[var(--text)]">
                          {t("auth.forgotPassword.emailLabel", "Email")}
                        </label>
                        <div className="mt-2">
                          <Input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t("auth.forgotPassword.emailPlaceholder", "you@example.com")}
                            autoComplete="email"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-[var(--text)]">
                          {t("auth.forgotPassword.phoneLabel", "Phone number")}
                        </label>
                        <div className="mt-2">
                          <Input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder={t("auth.forgotPassword.phonePlaceholder", "+91XXXXXXXXXX")}
                            autoComplete="tel"
                          />
                        </div>
                      </div>
                    )}

                    {error ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                      </div>
                    ) : null}

                    <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
                      {submitting
                        ? t("auth.forgotPassword.submitting", "Sending…")
                        : t("auth.forgotPassword.submit", "Send reset link")}
                    </Button>

                    <div className="pt-2">
                      <Link className="text-sm text-[var(--text-muted)] hover:underline" to="/login">
                        {t("auth.forgotPassword.backToLogin", "Back to login")}
                      </Link>
                    </div>
                  </form>
                </>
              )}
            </Card>
          </div>
        </div>
      </Page>
    </div>
  );
}
