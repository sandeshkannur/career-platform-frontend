// src/pages/LoginPage.jsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Page from "../ui/Page";
import Card from "../ui/Card";
import { useSession } from "../hooks/useSession";
import AuthHeader from "../ui/AuthHeader";
import { useContent } from "../locales/LanguageProvider";

export default function LoginPage() {
  const { login, requestOtp, loginWithOtp } = useSession();
  const location = useLocation();
  const { t } = useContent();

  const [mode, setMode] = useState("email"); // "email" | "phone"

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const [error, setError] = useState("");

  const redirectTo = location.state?.from?.pathname;

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError(t("auth.login.missingFields", "Email and password are required"));
      return;
    }

    try {
      await login(email, password, redirectTo);
    } catch (err) {
      setError(err?.message || t("auth.login.loginFailed", "Login failed"));
    }
  }

  async function handleRequestOtp(e) {
    e.preventDefault();
    setError("");

    if (!phone) {
      setError(t("auth.login.otp.missingPhone", "Phone number is required"));
      return;
    }

    setOtpLoading(true);
    try {
      await requestOtp(phone);
      setOtpSent(true);
    } catch (err) {
      setError(err?.message || t("auth.login.otp.requestFailed", "Could not send OTP"));
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError("");

    if (!otp) {
      setError(t("auth.login.otp.missingOtp", "Enter the OTP sent to your phone"));
      return;
    }

    try {
      await loginWithOtp(phone, otp, redirectTo);
    } catch (err) {
      setError(err?.message || t("auth.login.otp.verifyFailed", "Invalid or expired OTP"));
    }
  }

  function switchMode(next) {
    setMode(next);
    setError("");
    setOtpSent(false);
    setOtp("");
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Page maxWidth="920px">
        <div className="mx-auto grid min-h-screen items-center gap-10 py-10 md:grid-cols-[1fr_420px]">
          <div className="hidden md:block">
            <AuthHeader variant="minimal" />
            <div className="mt-6 space-y-2">
              <h1 className="text-2xl font-semibold text-[var(--text)]">
                {t("auth.login.headline", "Welcome back")}
              </h1>
              <p className="text-sm text-[var(--text-muted)]">
                {t("auth.login.blurb", "Sign in to continue your assessment journey.")}
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
                  {t("auth.login.title", "Login")}
                </h1>
                <p className="text-sm text-[var(--text-muted)]">
                  {t("auth.login.subtitle", "Sign in to continue")}
                </p>
              </div>

              <div className="mt-4 flex gap-2 rounded-lg border border-[var(--border)] p-1">
                <button
                  type="button"
                  onClick={() => switchMode("email")}
                  className={
                    mode === "email"
                      ? "flex-1 rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white"
                      : "flex-1 rounded-md px-3 py-2 text-sm font-medium text-[var(--text-muted)]"
                  }
                  style={{ minHeight: 40 }}
                >
                  {t("auth.login.modeEmail", "Email")}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("phone")}
                  className={
                    mode === "phone"
                      ? "flex-1 rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white"
                      : "flex-1 rounded-md px-3 py-2 text-sm font-medium text-[var(--text-muted)]"
                  }
                  style={{ minHeight: 40 }}
                >
                  {t("auth.login.modePhone", "Phone")}
                </button>
              </div>

              {mode === "email" ? (
                <form onSubmit={handleEmailSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)]">
                      {t("auth.login.emailLabel", "Email")}
                    </label>
                    <div className="mt-2">
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("auth.login.emailPlaceholder", "you@example.com")}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text)]">
                      {t("auth.login.passwordLabel", "Password")}
                    </label>
                    <div className="mt-2">
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("auth.login.passwordPlaceholder", "••••••••")}
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}

                  <Button type="submit" style={{ width: "100%" }}>
                    {t("auth.login.submit", "Login")}
                  </Button>
                </form>
              ) : (
                <div className="mt-5 space-y-4">
                  {!otpSent ? (
                    <form onSubmit={handleRequestOtp} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text)]">
                          {t("auth.login.phoneLabel", "Phone number")}
                        </label>
                        <div className="mt-2">
                          <Input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder={t("auth.login.phonePlaceholder", "+91XXXXXXXXXX")}
                            autoComplete="tel"
                          />
                        </div>
                      </div>

                      {error ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {error}
                        </div>
                      ) : null}

                      <Button type="submit" disabled={otpLoading} style={{ width: "100%" }}>
                        {otpLoading
                          ? t("auth.login.otp.sending", "Sending…")
                          : t("auth.login.otp.sendCode", "Send OTP")}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <p className="text-sm text-[var(--text-muted)]">
                        {t("auth.login.otp.sentTo", "Code sent to")} {phone}
                      </p>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text)]">
                          {t("auth.login.otp.codeLabel", "Enter OTP")}
                        </label>
                        <div className="mt-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder={t("auth.login.otp.codePlaceholder", "6-digit code")}
                            autoComplete="one-time-code"
                          />
                        </div>
                      </div>

                      {error ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {error}
                        </div>
                      ) : null}

                      <Button type="submit" style={{ width: "100%" }}>
                        {t("auth.login.otp.verify", "Verify & Login")}
                      </Button>

                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp("");
                          setError("");
                        }}
                        className="text-sm text-[var(--text-muted)] hover:underline"
                      >
                        {t("auth.login.otp.changeNumber", "Use a different number")}
                      </button>
                    </form>
                  )}
                </div>
              )}

              <div className="mt-4 text-sm text-[var(--text-muted)]">
                {t("auth.login.noAccount", "Don't have an account?")}{" "}
                <Link className="text-[var(--brand)] hover:underline" to="/signup">
                  {t("auth.login.createOne", "Create one")}
                </Link>
              </div>

              <div className="pt-2">
                <Link className="text-sm text-[var(--text-muted)] hover:underline" to="/">
                  {t("nav.backHome", "← Back to Home")}
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </Page>
    </div>
  );
}
