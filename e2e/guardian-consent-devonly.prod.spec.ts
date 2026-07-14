import { test, expect } from "@playwright/test";

/**
 * Runs against a real `vite build` + `vite preview` (see playwright.config.js
 * "prod-build" project) — the only way to actually exercise
 * `!import.meta.env.PROD`, since `npm run dev` is always dev-mode. Confirms
 * the DEV_ONLY debug JSON and "Verify Consent (Helper)" panel are
 * structurally absent, not merely hidden, in a production build.
 */
test("prod build: StudentConsentPage has no DEV_ONLY debug/helper markup", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("access_token", "FAKE_TEST_TOKEN");
  });

  await page.route("**/v1/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 1,
        email: "minor.student@example.com",
        role: "student",
        is_minor: true,
        consent_verified: false,
        guardian_email: "guardian@example.com",
      }),
    });
  });

  await page.route("**/v1/consent/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        state: "sent",
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      }),
    });
  });

  await page.goto("/student/consent");

  await expect(
    page.getByText("Guardian consent required", { exact: false })
  ).toBeVisible();

  await expect(page.getByText("DEV ONLY")).toHaveCount(0);
  await expect(page.getByText("Verify Consent (Helper)")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Verify OTP / Token" })).toHaveCount(0);
  await expect(page.locator("pre")).toHaveCount(0);
});
