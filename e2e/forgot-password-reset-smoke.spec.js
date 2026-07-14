import { test, expect } from "@playwright/test";
import { clearSession } from "./helpers/session.js";

test("Login page has a Forgot password link to /forgot-password", async ({ page }) => {
  await clearSession(page);
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole("heading", { name: "Forgot password" })).toBeVisible();
});

test("Forgot password: email/mobile channel toggle and generic success message", async ({ page }) => {
  await clearSession(page);

  await page.route("**/v1/auth/forgot-password/request", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { name: "Forgot password" })).toBeVisible();

  // Default channel is Email
  await page.getByPlaceholder("you@example.com").fill("student@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByText("Check your inbox")).toBeVisible();
  await expect(
    page.getByText("If an account exists for this email, we've sent a link to reset your password.")
  ).toBeVisible();
});

test("Reset password verify: missing token shows guidance to request a new link", async ({ page }) => {
  await clearSession(page);
  await page.goto("/reset-password");

  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await expect(
    page.getByText("This reset link is missing or invalid. Please request a new one.")
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Request a new link" })).toBeVisible();
});

test("Reset password verify: submits token + OTP + new password and redirects to login on success", async ({ page }) => {
  await clearSession(page);

  await page.route("**/v1/auth/forgot-password/verify", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/reset-password?token=fake-token-123");
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();

  await page.getByPlaceholder("6-digit code").fill("123456");
  await page.getByPlaceholder("Min 8 characters").fill("NewPassw0rd!");
  await page.getByPlaceholder("Re-enter new password").fill("NewPassw0rd!");
  await page.getByRole("button", { name: "Reset password" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByText("Password reset successful. Please sign in with your new password.")
  ).toBeVisible();
});
