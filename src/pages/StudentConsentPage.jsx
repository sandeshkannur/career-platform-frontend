// src/pages/StudentConsentPage.jsx
import { useEffect, useMemo, useState } from "react";
import SkeletonPage from "../ui/SkeletonPage";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { useSession } from "../hooks/useSession";
import { useNavigate } from "react-router-dom";
import { useContent } from "../locales/LanguageProvider";
import { SUPPORTED_LANGS } from "../ui/LanguageSwitcher";
import usePollUntilStatus from "../hooks/usePollUntilStatus";

import { requestConsent, getConsentStatus, verifyConsent } from "../api/consent";

const DEV_BYPASS_KEY = "__DEV_BYPASS_CONSENT__";
const VERIFIED_REDIRECT_DELAY_MS = 1500;

export default function StudentConsentPage() {
  const { logout, sessionUser, refreshSession } = useSession();
  const navigate = useNavigate();
  const { t, language } = useContent();

  // Guardian's reading language for the consent email (defaults to the
  // student's own UI locale as a starting guess; independently changeable).
  const [guardianLocale, setGuardianLocale] = useState(language);

  // DEV guard (Vite)
  const DEV_ONLY = !import.meta.env.PROD;

  const [devCode, setDevCode] = useState("");
  const devBypassOn =
    DEV_ONLY && sessionStorage.getItem(DEV_BYPASS_KEY) === "1";

  // Consent request (not status-polling) data
  const [requestLoading, setRequestLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState(null);

  const [requestData, setRequestData] = useState(null);
  const [consentExpiresAt, setConsentExpiresAt] = useState(null);

  // Student-side verification helper (DEV/TEST only). Primary flow remains the public guardian page.
  const [showVerifyPanel, setShowVerifyPanel] = useState(false);
  const [verifyToken, setVerifyToken] = useState("");
  const [verifyOtp, setVerifyOtp] = useState("");

  const guardianEmail = useMemo(() => {
    return sessionUser?.guardian_email || null;
  }, [sessionUser]);

  /**
   * Single place to land once consent is confirmed verified (either via the
   * automatic status poll or the DEV verify helper). Mirrors the existing
   * refreshSession-if-available pattern: without a real session refresh
   * available, a client-side navigate would bounce right back to this page
   * because ProtectedRoute reads a (now stale) cached session — so the
   * reliable fallback is a hard navigation, which forces a fresh session
   * bootstrap.
   */
  async function goToDashboardAfterVerified() {
    if (typeof refreshSession === "function") {
      await refreshSession();
      navigate("/student/dashboard", { replace: true });
    } else {
      window.location.assign("/student/dashboard");
    }
  }

  const {
    status: statusData,
    checkNow,
    hasConnectionTrouble,
    isExpired: expiredByClock,
  } = usePollUntilStatus({
    checkFn: getConsentStatus,
    isSuccess: (s) => s?.state === "verified",
    isTerminalFailure: (s) => s?.state === "expired",
    expiresAt: consentExpiresAt,
  });

  // Feed the latest known expires_at back into the poller so it can detect
  // expiry client-side too, and so a fresh "Send Consent Request" (which
  // returns a new expires_at) makes the poller resume automatically.
  useEffect(() => {
    if (statusData?.expires_at && statusData.expires_at !== consentExpiresAt) {
      setConsentExpiresAt(statusData.expires_at);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusData]);

  /**
   * Treat consent as verified if either:
   * - session says consent_verified true (authoritative for routing)
   * - status endpoint says "verified"
   */
  const consentVerified = useMemo(() => {
    // Support both backend snake_case and frontend camelCase (depends on useSession normalization)
    const v = sessionUser?.consent_verified ?? sessionUser?.consentVerified ?? false;

    if (v === true) return true;
    if (statusData?.state === "verified") return true;
    return false;
  }, [sessionUser, statusData]);

  const isExpired = !consentVerified && (expiredByClock || statusData?.state === "expired");

  /**
   * Guardian public verify URL (DEV/TEST convenience).
   * - Only present when backend returns requestData.dev.token
   * - Uses encodeURIComponent to keep the URL safe
   */
  const guardianVerifyUrl = useMemo(() => {
    const token = requestData?.dev?.token;
    if (!token) return null;
    return `${window.location.origin}/guardian/verify?token=${encodeURIComponent(token)}`;
  }, [requestData]);

  function enableDevBypass() {
    if (!DEV_ONLY) return;

    if (devCode.trim() !== "DEV") {
      alert('Enter "DEV" to enable bypass');
      return;
    }
    sessionStorage.setItem(DEV_BYPASS_KEY, "1");
    navigate("/student/dashboard", { replace: true });
  }

  function disableDevBypass() {
    if (!DEV_ONLY) return;

    sessionStorage.removeItem(DEV_BYPASS_KEY);
    alert("Dev bypass disabled. You will be gated again as a minor.");
  }

  async function handleRequestConsent() {
    setRequestLoading(true);
    setError(null);
    setRequestData(null);

    try {
      if (!guardianEmail) {
        throw new Error("guardian_email is missing in session. Cannot request consent.");
      }

      // If already verified, don't allow new requests (clean UX)
      if (consentVerified) {
        setError({
          status: 400,
          message: "Consent is already verified. No need to request again.",
        });
        return;
      }

      // Backend derives guardian_email from the authenticated student session;
      // guardian_locale tells it which language to send the consent email in.
      const data = await requestConsent({ guardian_locale: guardianLocale });
      setRequestData(data);

      if (data?.expires_at) setConsentExpiresAt(data.expires_at);
      checkNow();
    } catch (e) {
      setError({
        status: e?.status,
        message: e?.message || "Failed to request consent.",
        raw: e,
      });
    } finally {
      setRequestLoading(false);
    }
  }

  /**
   * DEV/TEST helper: allow student/dev tester to verify using token + OTP.
   * - Primary flow remains guardian public verify page.
   * - On success, redirect to dashboard (the status poll will also pick this
   *   up on its own, but there's no reason to wait for the next tick here).
   */
  async function handleVerifyConsent() {
    setVerifyLoading(true);
    setError(null);

    try {
      if (consentVerified) {
        setError({
          status: 400,
          message: "Consent is already verified.",
        });
        return;
      }

      if (!verifyToken.trim()) throw new Error("Token is required.");
      if (!verifyOtp.trim()) throw new Error("OTP is required.");

      await verifyConsent({
        token: verifyToken.trim(),
        otp: verifyOtp.trim(),
      });

      checkNow();
      await goToDashboardAfterVerified();
    } catch (e) {
      setError({
        status: e?.status,
        message: e?.message || "Failed to verify consent.",
        raw: e,
      });
    } finally {
      setVerifyLoading(false);
    }
  }

  // DEV convenience: auto-fill verify inputs from dev payload, if present.
  useEffect(() => {
    if (requestData?.dev?.token) setVerifyToken(requestData.dev.token);
    if (requestData?.dev?.otp) setVerifyOtp(requestData.dev.otp);
  }, [requestData]);

  // If consent becomes verified, hide the helper panel (clean UX)
  useEffect(() => {
    if (consentVerified) setShowVerifyPanel(false);
  }, [consentVerified]);

  // Consent just got verified (via the automatic poll) -> brief confirmation,
  // then redirect. Runs once per transition into "verified".
  useEffect(() => {
    if (!consentVerified) return undefined;

    const timer = setTimeout(() => {
      goToDashboardAfterVerified();
    }, VERIFIED_REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consentVerified]);

  return (
    <SkeletonPage
      title={t("consent.required.title", "Guardian consent required ⚠️")}
      subtitle={t("consent.required.body", "Your account is marked as a minor. Please complete guardian consent verification to unlock reports and continue.")}
      actions={<Button onClick={logout}>{t("consent.page.actions.logout", "Logout")}</Button>}
    >
      <p>
        {t("consent.page.studentEmail", "Student email:")} <b>{sessionUser?.email}</b>
      </p>

      <p style={{ marginTop: 12 }}>
        {t("consent.page.minorNotice.prefix", "This student account is marked as a")}{" "}
        <b>{t("consent.page.minorNotice.minorBold", "minor")}</b>
        {t("consent.page.minorNotice.suffix", ". Before assessments can begin, parental or guardian consent must be verified.")}
      </p>

      {/* Verified banner (UX polish) */}
      {consentVerified ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #b7e3c0",
            background: "#f3fff6",
            borderRadius: 8,
          }}
        >
          <div style={{ fontWeight: 800 }}>
            {t("consent.verified.title", "Parental consent verified ✅")}
          </div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#2b6b3f" }}>
            {t("consent.page.status.redirecting", "Guardian consent verified! Redirecting…")}
          </div>
          <div style={{ marginTop: 10 }}>
            <Button onClick={goToDashboardAfterVerified}>
              {t("consent.page.actions.goToDashboard", "Go to Dashboard")}
            </Button>
          </div>
        </div>
      ) : isExpired ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #f0d38a",
            background: "#fffaf0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontWeight: 800 }}>
            {t("consent.page.expired.title", "This link has expired")}
          </div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#8a6d1f" }}>
            {t("consent.page.expired.body", "The consent request your guardian received is no longer valid. Send a new one below.")}
          </div>
        </div>
      ) : statusData?.state === "sent" ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #cfe0f5",
            background: "#f5f9ff",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 14 }}>
            {t("consent.page.waiting.body", "We've emailed your guardian. This can take a few minutes if they're not near their phone right now.")}
          </div>
          <div style={{ marginTop: 10 }}>
            <Button variant="secondary" onClick={checkNow}>
              {t("consent.page.actions.checkNow", "Check now")}
            </Button>
          </div>
          {hasConnectionTrouble ? (
            <div style={{ marginTop: 8, fontSize: 13, color: "#8a6d1f" }}>
              {t("consent.page.waiting.connectionTrouble", "Having trouble checking — we'll keep trying.")}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 14 }}>
            {t("consent.page.idle.body", "You haven't requested guardian consent yet. Use \"Send Consent Request\" below to email your guardian.")}
          </div>
        </div>
      )}

      {/* Status panel */}
      <div style={{ marginTop: 14, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <div style={{ fontWeight: 800 }}>
          {t("consent.page.status.statusTitle", "Consent Status")}
        </div>

        <div style={{ marginTop: 8, fontSize: 14, color: "#555" }}>
          {t("consent.page.status.guardianEmail", "Guardian email on file:")}{" "}
          <b>{guardianEmail ? guardianEmail : t("consent.page.status.missing", "— missing —")}</b>
        </div>

        {error ? (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              border: "1px solid #f3b4b4",
              background: "#fff6f6",
              borderRadius: 8,
            }}
          >
            <div style={{ fontWeight: 800 }}>
              {t("consent.page.error.title", "Error")}{error.status ? ` (HTTP ${error.status})` : ""}
            </div>
            <div style={{ fontSize: 14 }}>{error.message}</div>
          </div>
        ) : null}

        {DEV_ONLY && statusData ? (
          <pre style={{ marginTop: 10, marginBottom: 0, padding: 10, overflowX: "auto" }}>
            {JSON.stringify(statusData, null, 2)}
          </pre>
        ) : null}
      </div>

      {/* Guardian locale selector */}
      {!consentVerified ? (
        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            {t("consent.page.guardianLocale.label", "What language does your parent or guardian read?")}
          </label>
          <select
            value={guardianLocale}
            onChange={(e) => setGuardianLocale(e.target.value)}
            disabled={requestLoading}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              maxWidth: "100%",
              boxSizing: "border-box",
            }}
          >
            {SUPPORTED_LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
            {t("consent.page.guardianLocale.hint", "We'll send the consent email in this language. You can change it if needed.")}
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button
          onClick={handleRequestConsent}
          disabled={requestLoading || !guardianEmail || consentVerified}
        >
          {requestLoading
            ? t("consent.page.actions.sending", "Sending…")
            : t("consent.page.actions.sendConsentRequest", "Send Consent Request")}
        </Button>

        {DEV_ONLY ? (
          <Button
            variant="secondary"
            onClick={() => setShowVerifyPanel((v) => !v)}
            disabled={consentVerified}
          >
            {t("consent.page.actions.verifyOtpToken", "Verify OTP / Token")}
          </Button>
        ) : null}
      </div>

      {/* Optional student-side verify helper (DEV/TEST only) */}
      {DEV_ONLY && showVerifyPanel ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            {t("consent.page.verify.helperTitle", "Verify Consent (Helper)")}
          </div>

          <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                {t("consent.page.verify.tokenLabel", "Token")}
              </div>
              <Input
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                placeholder={t("consent.page.verify.tokenPlaceholder", "Paste consent token")}
              />
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                {t("consent.page.verify.otpLabel", "OTP")}
              </div>
              <Input
                value={verifyOtp}
                onChange={(e) => setVerifyOtp(e.target.value)}
                placeholder={t("consent.page.verify.otpPlaceholder", "Enter OTP")}
              />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button onClick={handleVerifyConsent} disabled={verifyLoading}>
                {verifyLoading
                  ? t("consent.page.actions.verifying", "Verifying…")
                  : t("consent.page.actions.verify", "Verify")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowVerifyPanel(false)}
                disabled={verifyLoading}
              >
                {t("consent.page.actions.close", "Close")}
              </Button>
            </div>

            <div style={{ fontSize: 12, color: "#666" }}>
              {t("consent.page.verify.helperNote", "Note: Primary flow is the public guardian page. This helper is for DEV/testing only.")}
            </div>
          </div>
        </div>
      ) : null}

      {/* Request response debug (DEV/TEST only) */}
      {DEV_ONLY && requestData ? (
        <div style={{ marginTop: 14, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            {t("consent.page.debug.responseTitle", "Consent Request Response (temporary debug)")}
          </div>

          <pre style={{ margin: 0, padding: 10, overflowX: "auto" }}>
            {JSON.stringify(requestData, null, 2)}
          </pre>

          {/* Guardian Verify Link helper (DEV/TEST convenience) */}
          {guardianVerifyUrl ? (
            <div style={{ marginTop: 10, fontSize: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>
                {t("consent.page.debug.guardianVerifyLink", "Guardian Verify Link")}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <a href={guardianVerifyUrl} target="_blank" rel="noreferrer">
                  {t("consent.page.debug.openGuardianVerificationPage", "Open guardian verification page")}
                </a>

                <Button
                  variant="secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(guardianVerifyUrl);
                    alert(t("consent.page.debug.guardianLinkCopied", "Guardian link copied to clipboard"));
                  }}
                >
                  {t("consent.page.debug.copyLink", "Copy link")}
                </Button>
              </div>

              {requestData?.dev?.otp ? (
                <div style={{ marginTop: 8 }}>
                  {t("consent.page.debug.otpDev", "OTP (DEV):")} <b>{requestData.dev.otp}</b>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ---------------- DEV ONLY OVERRIDE ---------------- */}
      {DEV_ONLY ? (
        <div
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: "1px dashed #ddd",
          }}
        >
          <p style={{ margin: 0, fontWeight: 700 }}>
            {t("consent.page.dev.devOnly", "DEV ONLY")}
          </p>
          <p style={{ margin: "6px 0 0", color: "#666" }}>
            {t("consent.page.dev.bypassNote", "Temporary bypass to continue development without OTP flow. Remove later.")}
          </p>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ minWidth: 220 }}>
              <Input
                value={devCode}
                onChange={(e) => setDevCode(e.target.value)}
                placeholder={t("consent.page.dev.placeholder", 'Type "DEV"')}
              />
            </div>

            <Button onClick={enableDevBypass}>
              {t("consent.page.dev.enableBypass", "Enable Dev Bypass & Continue")}
            </Button>

            {devBypassOn ? (
              <Button variant="secondary" onClick={disableDevBypass}>
                {t("consent.page.dev.disableBypass", "Disable Bypass")}
              </Button>
            ) : null}
          </div>

          {devBypassOn ? (
            <p style={{ marginTop: 10, color: "green" }}>
              {t("consent.page.dev.bypassOn", "Dev bypass is ON ✅ (sessionStorage)")}
            </p>
          ) : (
            <p style={{ marginTop: 10, color: "#999" }}>
              {t("consent.page.dev.bypassOff", "Dev bypass is OFF")}
            </p>
          )}
        </div>
      ) : null}
      {/* --------------------------------------------------- */}
    </SkeletonPage>
  );
}
