// src/pages/guardian/GuardianVerifyPage.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Page from "../../ui/Page";
import Card from "../../ui/Card";
import AuthHeader from "../../ui/AuthHeader";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import { useContent } from "../../locales/LanguageProvider";
import { SUPPORTED_LANGS } from "../../ui/LanguageSwitcher";

const SUPPORTED_LOCALE_CODES = SUPPORTED_LANGS.map((l) => l.code);

/**
 * Best-effort decode JWT payload (for display only).
 * Not trusted. Backend verification is source of truth.
 */
function tryDecodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");

    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/**
 * Build API URL without auth/session dependencies.
 * - Uses VITE_API_BASE_URL if set (prod)
 * - Otherwise relies on Vite proxy (dev)
 */
function buildApiUrl(path) {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  return `${base}${path}`;
}

export default function GuardianVerifyPage() {
  const [searchParams] = useSearchParams();
  const { t, language, setLanguage } = useContent();
  const tokenFromUrl = searchParams.get("token") || "";

  // Allow token to be pasted manually (prevents URL truncation issues)
  const [token, setToken] = useState(tokenFromUrl);

  // Keep token in sync if page is opened with a token in URL
  useEffect(() => {
    setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  const decoded = useMemo(() => (token ? tryDecodeJwtPayload(token) : null), [token]);

  const guardianEmail =
    decoded?.guardian_email ||
    decoded?.guardianEmail ||
    decoded?.email ||
    t(
      "guardian.verify.guardianFallback",
      "(will confirm after verification)"
    );

  /**
   * Resolve which language to render the guardian-facing form in, without an
   * extra API call:
   *   1) a locale claim on the consent JWT itself, if the backend ever adds one
   *   2) a ?locale= query param on the verification URL
   * Neither is guaranteed to be present today, so this only overrides the
   * default when a supported value is actually found. The LanguageSwitcher
   * dropdown remains so the guardian can always change it manually.
   */
  const localeFromToken = decoded?.guardian_locale || decoded?.locale || null;
  const localeFromQuery = searchParams.get("locale");
  const resolvedLocale = [localeFromToken, localeFromQuery].find((code) =>
    SUPPORTED_LOCALE_CODES.includes(code)
  );

  const autoAppliedRef = useRef(false);
  useEffect(() => {
    if (autoAppliedRef.current) return;
    if (resolvedLocale && resolvedLocale !== language) {
      setLanguage(resolvedLocale);
    }
    if (resolvedLocale) autoAppliedRef.current = true;
  }, [resolvedLocale, language, setLanguage]);

  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [status, setStatus] = useState("idle"); // idle | success | error
  const [message, setMessage] = useState("");

  // Quick client-side sanity (not authoritative)
  const tokenLooksValid = useMemo(() => {
    if (!token) return false;
    const parts = token.split(".");
    return parts.length === 3 && token.length > 30; // basic heuristic
  }, [token]);

  async function onSubmit(e) {
    e.preventDefault();

    if (!tokenLooksValid) {
      setStatus("error");
      setMessage(
        t(
          "guardian.verify.messages.tokenIncomplete",
          "Token looks missing or incomplete. Please paste the full token (it may have been truncated in the URL)."
        )
      );
      return;
    }
    if (!otp.trim()) {
      setStatus("error");
      setMessage(t("guardian.verify.messages.enterOtp", "Please enter the OTP."));
      return;
    }

    setSubmitting(true);
    setStatus("idle");
    setMessage("");

    try {
      const res = await fetch(buildApiUrl("/v1/consent/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // IMPORTANT: no Authorization header here (public guardian flow)
        body: JSON.stringify({ token, otp: otp.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg =
          data?.detail ||
          data?.message ||
          t("guardian.verify.messages.verificationFailed", "Verification failed.");
        setStatus("error");
        setMessage(errMsg);
        return;
      }

      if (data?.verified === true || data?.status === "verified") {
        setStatus("success");
        setMessage(
          t(
            "guardian.verify.messages.successCloseTab",
            "Consent verified successfully. You may now close this tab."
          )
        );
      } else {
        setStatus("error");
        setMessage(
          data?.message ||
            t("guardian.verify.messages.verificationRejected", "Verification rejected.")
        );
      }
    } catch (err) {
      setStatus("error");
      setMessage(
        err?.message ||
          t("guardian.verify.messages.networkError", "Network error. Please try again.")
      );
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
                  {t("guardian.verify.title", "Guardian Consent Verification")}
                </h1>
                <p className="text-sm text-[var(--text-muted)]">
                  {t(
                    "guardian.verify.subtitle",
                    "Enter the OTP you received to verify consent for the student."
                  )}
                </p>
              </div>

              <div className="mt-5 space-y-1 rounded-lg border border-[var(--border)] px-3 py-3">
                <div className="text-xs text-[var(--text-muted)]">
                  {t("guardian.verify.labels.guardian", "Guardian")}
                </div>
                <div className="text-sm font-semibold text-[var(--text)]">{guardianEmail}</div>

                <div className="mt-3 text-xs text-[var(--text-muted)]">
                  {t("guardian.verify.labels.verificationLink", "Verification link")}
                </div>
                <div className="text-sm">
                  {tokenLooksValid ? (
                    <span className="text-green-700">
                      {t("guardian.verify.status.tokenPresent", "Token present ✅")}
                    </span>
                  ) : (
                    <span className="text-red-700">
                      {t(
                        "guardian.verify.status.tokenMissing",
                        "Token missing or incomplete ❌ (paste token below)"
                      )}
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-medium text-[var(--text-muted)]">
                    {t("guardian.verify.labels.tokenFull", "Token (paste full token if needed)")}
                  </label>
                  <textarea
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={t(
                      "guardian.verify.placeholders.tokenFull",
                      "Paste the full consent token here (if the URL token is missing/truncated)"
                    )}
                    rows={4}
                    className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--color-surface,#fff)] px-3 py-2 font-mono text-xs text-[var(--text)]"
                  />
                </div>
              </div>

              <form onSubmit={onSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)]">
                    {t("guardian.verify.labels.otp", "OTP")}
                  </label>
                  <div className="mt-2">
                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder={t("guardian.verify.placeholders.otp", "Enter OTP")}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                  </div>
                </div>

                {status === "error" ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {message}
                    <div className="mt-2 text-xs opacity-90">
                      {t(
                        "guardian.verify.error.tipLongLink",
                        "Tip: If you copied a long link, the token might be truncated. Paste the full token above and try again."
                      )}
                    </div>
                  </div>
                ) : null}

                {status === "success" ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800">
                    {message}
                    <div className="mt-2 text-xs opacity-90">
                      {t("guardian.verify.success.closeWindow", "You can safely close this tab/window now.")}
                    </div>
                  </div>
                ) : (
                  <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
                    {submitting
                      ? t("guardian.verify.actions.verifying", "Verifying...")
                      : t("guardian.verify.actions.verifyConsent", "Verify Consent")}
                  </Button>
                )}
              </form>
            </Card>
          </div>
        </div>
      </Page>
    </div>
  );
}
