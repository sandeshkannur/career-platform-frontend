// src/pages/ResetPasswordVerifyPage.jsx
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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

/**
 * Backend error shape for this endpoint isn't fully documented, so we branch
 * on the unambiguous status codes (429, 409) first, then fall back to
 * inspecting the detail message for the expired-vs-invalid-OTP distinction.
 */
function classifyError(status, detail) {
  if (status === 429) return "tooManyAttempts";
  if (status === 409) return "alreadyUsed";

  const text = (detail || "").toLowerCase();
  if (text.includes("expir")) return "expired";
  if (text.includes("otp") || text.includes("invalid") || text.includes("incorrect")) return "invalidOtp";

  return "generic";
}

export default function ResetPasswordVerifyPage() {
  const { t } = useContent();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!otp.trim() || !newPassword || !confirmPassword) {
      setError(t("auth.resetPasswordVerify.errors.missingFields", "Enter the code and your new password."));
      return;
    }
    if (newPassword.length < 8) {
      setError(t("auth.resetPasswordVerify.errors.tooShort", "New password must be at least 8 characters."));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.resetPasswordVerify.errors.mismatch", "New password and confirmation do not match."));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(buildApiUrl("/v1/auth/forgot-password/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, otp: otp.trim(), new_password: newPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const detail = data?.detail || data?.message || "";
        const kind = classifyError(res.status, detail);

        const messages = {
          tooManyAttempts: t("auth.resetPasswordVerify.errors.tooManyAttempts", "Too many attempts. Please request a new reset link."),
          alreadyUsed: t("auth.resetPasswordVerify.errors.alreadyUsed", "This reset link has already been used. Please request a new one."),
          expired: t("auth.resetPasswordVerify.errors.expired", "This reset link has expired. Please request a new one."),
          invalidOtp: t("auth.resetPasswordVerify.errors.invalidOtp", "That code is incorrect. Please check and try again."),
          generic: detail || t("auth.resetPasswordVerify.errors.failed", "Could not reset your password. Please try again."),
        };

        setError(messages[kind]);
        return;
      }

      navigate("/login", {
        replace: true,
        state: {
          successMessage: t(
            "auth.resetPasswordVerify.successRedirect",
            "Password reset successful. Please sign in with your new password."
          ),
        },
      });
    } catch {
      setError(t("auth.resetPasswordVerify.errors.failed", "Could not reset your password. Please try again."));
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
                  {t("auth.resetPasswordVerify.title", "Reset your password")}
                </h1>
                <p className="text-sm text-[var(--text-muted)]">
                  {t("auth.resetPasswordVerify.subtitle", "Enter the code you received and choose a new password.")}
                </p>
              </div>

              {!token ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {t("auth.resetPasswordVerify.missingToken", "This reset link is missing or invalid. Please request a new one.")}
                  </div>
                  <Link className="text-sm text-[var(--brand)] hover:underline" to="/forgot-password">
                    {t("auth.resetPasswordVerify.requestNewLink", "Request a new link")}
                  </Link>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)]">
                      {t("auth.resetPasswordVerify.otpLabel", "Verification code")}
                    </label>
                    <div className="mt-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder={t("auth.resetPasswordVerify.otpPlaceholder", "6-digit code")}
                        autoComplete="one-time-code"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text)]">
                      {t("auth.resetPasswordVerify.newPasswordLabel", "New password")}
                    </label>
                    <div className="mt-2">
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t("auth.resetPasswordVerify.newPasswordPlaceholder", "Min 8 characters")}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text)]">
                      {t("auth.resetPasswordVerify.confirmPasswordLabel", "Confirm new password")}
                    </label>
                    <div className="mt-2">
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t("auth.resetPasswordVerify.confirmPasswordPlaceholder", "Re-enter new password")}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}

                  <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
                    {submitting
                      ? t("auth.resetPasswordVerify.submitting", "Resetting…")
                      : t("auth.resetPasswordVerify.submit", "Reset password")}
                  </Button>

                  <div className="pt-2">
                    <Link className="text-sm text-[var(--text-muted)] hover:underline" to="/forgot-password">
                      {t("auth.resetPasswordVerify.requestNewLink", "Request a new link")}
                    </Link>
                  </div>
                </form>
              )}
            </Card>
          </div>
        </div>
      </Page>
    </div>
  );
}
