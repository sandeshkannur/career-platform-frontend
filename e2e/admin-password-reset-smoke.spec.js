import { test, expect } from "@playwright/test";
import { mockSession } from "./helpers/session.js";

test("Admin: Password Reset Logs page loads and lists entries", async ({ page }) => {
  await mockSession(page, { role: "admin" });

  await page.route("**/v1/admin/password-reset-logs**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: 1,
            user_email: "student1@example.com",
            initiated_by_admin_email: null,
            method: "forgot_email",
            status: "completed",
            reason: null,
            token_jti: "abc-123",
            ip: "203.0.113.5",
            user_agent: "Mozilla/5.0",
            created_at: "2026-07-10T10:15:00Z",
          },
        ],
        total: 1,
        page: 1,
        page_size: 50,
      }),
    });
  });

  await page.goto("/admin/password-reset-logs");
  await expect(page.getByRole("heading", { name: "Password Reset Logs" })).toBeVisible();
  await expect(page.getByText("student1@example.com")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Forgot (Email)" })).toBeVisible();
});

test("Admin: Password Reset Logs is reachable from the Admin Console nav", async ({ page }) => {
  await mockSession(page, { role: "admin" });
  await page.route("**/v1/admin/password-reset-logs**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 50 }),
    });
  });

  await page.goto("/admin");
  await page.getByRole("button", { name: "Password Reset Logs" }).click();
  await expect(page).toHaveURL(/\/admin\/password-reset-logs$/);
  await expect(page.getByRole("heading", { name: "Password Reset Logs" })).toBeVisible();
});

test("Admin: Reset Password action on a counsellor sends the trigger request and shows success", async ({ page }) => {
  await mockSession(page, { role: "admin" });

  await page.route("**/v1/admin/counsellors**", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        counsellors: [
          { id: 11, full_name: "Anita Rao", email: "anita@example.com", phone_number: "+919876543210", dob: "1990-01-01", is_active: true },
        ],
        total: 1,
      }),
    });
  });

  let requestBody = null;
  await page.route("**/v1/admin/users/11/reset-password/trigger", async (route) => {
    requestBody = route.request().postData();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, message: "Reset link sent to anita@example.com" }),
    });
  });

  await page.goto("/admin/counsellors");
  await page.getByRole("button", { name: "Reset Password" }).click();
  await page.getByRole("button", { name: "Send reset link" }).click();
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Send a password reset link to Anita Rao's email on file?")).toBeVisible();

  await page.getByRole("button", { name: "Yes, send it" }).click();
  await expect(page.getByText("Reset link sent to anita@example.com")).toBeVisible();
  expect(JSON.parse(requestBody)).toEqual({ channel: "email" });
});
