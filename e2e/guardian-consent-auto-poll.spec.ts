import { test, expect } from "@playwright/test";

/**
 * Verifies the core UX fix: the student's "Guardian consent required" page
 * must detect verification automatically (via usePollUntilStatus) without
 * any manual click. Uses page.clock to fast-forward through the poller's
 * backoff schedule instead of waiting on real wall-clock time.
 */
test("StudentConsentPage transitions from waiting to verified automatically", async ({ page }) => {
  let consentCheckCount = 0;
  let verified = false;

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
        consent_verified: verified,
        guardian_email: "guardian@example.com",
      }),
    });
  });

  await page.route("**/v1/consent/status", async (route) => {
    consentCheckCount += 1;
    // First check: still pending. Every check after: guardian has verified.
    if (consentCheckCount >= 2) verified = true;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        state: verified ? "verified" : "sent",
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      }),
    });
  });

  // Install fake timers before the page loads so the poller's setTimeout
  // calls (and Date.now() calls) are all under our control.
  await page.clock.install({ time: new Date() });

  await page.goto("/student/consent");

  await expect(
    page.getByText("We've emailed your guardian.", { exact: false })
  ).toBeVisible();
  expect(consentCheckCount).toBe(1);

  // No manual "Check now" click here — fast-forward past the first backoff
  // tier (default schedule: 10s) so the poller's own timer fires the 2nd check.
  await page.clock.fastForward("00:11");

  await expect(
    page.getByText("Guardian consent verified! Redirecting", { exact: false })
  ).toBeVisible();
  expect(consentCheckCount).toBeGreaterThanOrEqual(2);
});
