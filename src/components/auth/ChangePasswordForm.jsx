// src/components/auth/ChangePasswordForm.jsx
import { useState } from "react";
import { apiPost } from "../../apiClient";
import { useContent } from "../../locales/LanguageProvider";
import Input from "../../ui/Input";
import Button from "../../ui/Button";

export default function ChangePasswordForm() {
  const { t } = useContent();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t("auth.changePassword.errors.missingFields", "All fields are required."));
      return;
    }

    if (newPassword.length < 8) {
      setError(t("auth.changePassword.errors.tooShort", "New password must be at least 8 characters."));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("auth.changePassword.errors.mismatch", "New password and confirmation do not match."));
      return;
    }

    if (newPassword === currentPassword) {
      setError(t("auth.changePassword.errors.sameAsCurrent", "New password must be different from your current password."));
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/v1/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (err?.status === 401 || err?.status === 400) {
        setError(t("auth.changePassword.errors.incorrectCurrent", "Current password is incorrect."));
      } else {
        setError(err?.message || t("auth.changePassword.errors.failed", "Could not update password. Please try again."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: "var(--color-surface, #FFFFFF)", border: "1px solid var(--color-border, #6B7280)", borderRadius: 14, padding: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
        {t("auth.changePassword.title", "Change Password")}
      </div>
      <p style={{ fontSize: 13, color: "var(--color-ink-500, #6B7280)", margin: "0 0 16px" }}>
        {t("auth.changePassword.subtitle", "Update your account password.")}
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            {t("auth.changePassword.currentPasswordLabel", "Current password")}
          </label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder={t("auth.changePassword.currentPasswordPlaceholder", "••••••••")}
            autoComplete="current-password"
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            {t("auth.changePassword.newPasswordLabel", "New password")}
          </label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t("auth.changePassword.newPasswordPlaceholder", "Min 8 characters")}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            {t("auth.changePassword.confirmPasswordLabel", "Confirm new password")}
          </label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t("auth.changePassword.confirmPasswordPlaceholder", "Re-enter new password")}
            autoComplete="new-password"
          />
        </div>

        {error ? (
          <div style={{ borderRadius: 8, border: "1px solid #f3c2c2", background: "#fdf2f2", padding: "8px 12px", fontSize: 13, color: "#b23" }}>
            {error}
          </div>
        ) : null}

        {success ? (
          <div style={{ borderRadius: 8, border: "1px solid #cfe9cf", background: "#f2fbf2", padding: "8px 12px", fontSize: 13, color: "#067A52" }}>
            {t("auth.changePassword.success", "Your password has been updated.")}
          </div>
        ) : null}

        <div>
          <Button type="submit" disabled={submitting}>
            {submitting
              ? t("auth.changePassword.submitting", "Updating…")
              : t("auth.changePassword.submit", "Update password")}
          </Button>
        </div>
      </form>
    </div>
  );
}
