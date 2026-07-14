// playwright.config.js
/* eslint-disable no-undef */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },

  webServer: [
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5173",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Prod-mode build+preview, used only by *.prod.spec.ts to verify
      // DEV_ONLY-gated UI is structurally absent (not just hidden) in prod.
      command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4174",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],

  use: {
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "dev",
      testIgnore: /.*\.prod\.spec\.ts/,
      use: { baseURL: "http://127.0.0.1:5173" },
    },
    {
      name: "prod-build",
      testMatch: /.*\.prod\.spec\.ts/,
      use: { baseURL: "http://127.0.0.1:4174" },
    },
  ],

  reporter: [["html", { open: "never" }]],
});
