// scripts/audit-overflow.mjs
// One-time diagnostic: audits student-facing routes for horizontal overflow at
// mobile width (375x812). Read-only — does not touch app source.
//
// Usage: start the dev server (npm run dev -- --host 127.0.0.1 --port 5173),
// then: node scripts/audit-overflow.mjs
import { chromium } from "@playwright/test";
import { mockSession, clearSession } from "../e2e/helpers/session.js";

const BASE = process.env.AUDIT_BASE_URL || "http://127.0.0.1:5173";
const VIEWPORT = { width: 375, height: 812 };

// Routes enumerated from src/AppRoutes.jsx (student-facing + public-facing)
const ROUTES = [
  { path: "/login", public: true }, // must render logged-out or it redirects to the dashboard
  "/pricing",
  "/student/dashboard",
  "/student/onboarding",
  "/student/context",
  "/student/assessment",
  "/student/assessment/run/1",
  "/student/assessment/submit/1",
  "/student/results/latest",
  "/student/results/history",
  "/student/careers/1",
  "/student/profile",
  "/student/reports/1",
  "/student/consent",
  "/student/interest", // referenced by StudentResultsPage nav; check what it serves
];

// Mock premium student data (same shapes used for the results-page verification)
const CAREERS = [
  { career_id: 1, title: "Software Engineer", fit_band_key: "high_potential", cluster: "Info Tech", recommended_stream: "Science (PCM)", indian_job_title: "SDE", description: "Builds software systems used by millions of people.", salary_entry_inr: 500000, salary_mid_inr: 1500000, salary_peak_inr: 4000000, automation_risk: "low", future_outlook: "growing", matched_keyskills: [{ keyskill_name: "Logical reasoning" }, { keyskill_name: "Problem solving" }], pathway_step1: "Finish Class 12 with PCM", pathway_step2: "B.Tech / BCA degree", pathway_step3: "Internships and projects", pathway_accessible: "State engineering colleges via CET", pathway_earn_learn: "Apprenticeship at IT firms", pathway_premium: "IIT via JEE Advanced", top_tier_potential: "Global tech companies hire from top campuses." },
  { career_id: 2, title: "Data Analyst", fit_band_key: "strong", cluster: "Info Tech", recommended_stream: "Science (PCM)", description: "Turns raw data into decisions.", salary_entry_inr: 400000, salary_mid_inr: 1000000, salary_peak_inr: 2500000, automation_risk: "medium", future_outlook: "growing", matched_keyskills: [{ keyskill_name: "Numerical ability" }] },
  { career_id: 3, title: "Physiotherapist", fit_band_key: "promising", cluster: "Health Sci", recommended_stream: "Science (PCB)", description: "Helps patients recover movement and strength.", salary_entry_inr: 300000, salary_mid_inr: 700000, salary_peak_inr: 1500000, automation_risk: "low", future_outlook: "stable", matched_keyskills: [{ keyskill_name: "Empathy" }] },
  { career_id: 4, title: "Graphic Designer", fit_band_key: "developing", cluster: "Arts & A/V", description: "Designs visual communication.", salary_entry_inr: 250000, salary_mid_inr: 600000, salary_peak_inr: 1400000, automation_risk: "high", future_outlook: "stable" },
  { career_id: 5, title: "Hotel Manager", fit_band_key: "exploring", cluster: "Hospitality", description: "Runs hotel operations end to end.", salary_entry_inr: 350000, salary_mid_inr: 900000, salary_peak_inr: 2000000 },
];

const RESULTS_PAYLOAD = {
  total_results: 1,
  results: [{
    assessment_id: 10,
    generated_at: "2026-07-01T10:00:00Z",
    results_payload_version: "v1",
    recommended_careers: CAREERS,
    top_careers: CAREERS,
    blocks: [
      { block_type: "TOP_CAREERS", items: CAREERS },
      { block_type: "FACET_INSIGHTS", facet_keys: ["facet_key_1", "facet_key_2"] },
      { block_type: "ASSOCIATED_QUALITIES", aq_keys: ["aq_key_1"] },
    ],
  }],
};

async function setupPage(context, { loggedOut = false } = {}) {
  const page = await context.newPage();

  if (loggedOut) {
    await page.route("**/v1/**", (r) => r.fulfill({ json: {} }));
    await clearSession(page); // reuse helper: no token + 401 on /me
    return page;
  }

  // Catch-all FIRST (Playwright gives precedence to later-registered routes):
  // any endpoint without a specific mock gets calm empty JSON, nothing leaks
  // to the real backend.
  await page.route("**/v1/**", (r) => r.fulfill({ json: {} }));

  // Reuse the repo's session mocking (token seeding + /v1/auth/me)
  await mockSession(page, { role: "student", is_minor: false, consent_verified: true });

  // Richer /me override: pages need student_profile.student_id; premium tier
  await page.route("**/v1/auth/me", (r) =>
    r.fulfill({ json: { id: 1, email: "test@example.com", role: "student", is_minor: false, consent_verified: true, subscription_tier: "premium", student_profile: { student_id: 1, full_name: "Test Student", grade: "10" } } }));

  await page.addInitScript(() => {
    localStorage.setItem("career_platform_language", "en");
  });

  // Premium data mocks (generalized from the results-page verification work)
  await page.route("**/v1/students/1/results**", (r) => r.fulfill({ json: RESULTS_PAYLOAD }));
  await page.route("**/v1/recommendations/1**", (r) => r.fulfill({ json: { recommended_careers: CAREERS } }));
  await page.route("**/v1/interest/1**", (r) => r.fulfill({ json: { top_clusters: ["Info Tech", "STEM", "Business"] } }));
  await page.route("**/v1/assessments/*/context-profile**", (r) =>
    r.fulfill({ json: { ses_band: "middle", education_board: "State board", support_level: "medium", resource_access: "shared device" } }));
  await page.route("**/v1/content/explainability**", (r) => {
    const url = new URL(r.request().url());
    const keys = (url.searchParams.get("keys") || "").split(",").filter(Boolean);
    r.fulfill({ json: { items: keys.map((k) => ({ explanation_key: k, text: `Resolved insight copy for ${k}.` })) } });
  });
  await page.route("**/v1/paid-analytics/1/deep**", (r) =>
    r.fulfill({ json: { cluster_insights: [{ insight_keys: ["ci_1"] }], career_insights: [{ why_keys: ["wk_1"] }], next_steps: { keys: ["ns_1", "ns_2"] } } }));

  return page;
}

// In-page overflow probe.
// Bug fix vs the original spec: elements inside a horizontally-scrollable
// ancestor (overflow-x: auto|scroll) are deliberately scrollable content —
// their rects extend past the viewport at scrollLeft=0 by design, and they
// cannot cause page-level overflow (the container clips/scrolls them). The
// original probe flagged these as offenders (false positive). The scroll
// container ITSELF is still audited normally, as is everything else.
const probe = () => {
  const vw = document.documentElement.clientWidth;
  const offenders = [];
  const inHorizontalScroller = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
    return false;
  };
  document.querySelectorAll("*").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 2 || r.left < -2) {
      if (inHorizontalScroller(el)) return;
      offenders.push({
        tag: el.tagName,
        cls: (el.className || "").toString().slice(0, 80),
        left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width),
      });
    }
  });
  return { vw, docScrollWidth: document.documentElement.scrollWidth, offenders };
};

function spill(o, vw) {
  return Math.max(o.right - vw, -o.left);
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT });

const report = [];
for (const entry of ROUTES) {
  const route = typeof entry === "string" ? entry : entry.path;
  const page = await setupPage(context, { loggedOut: typeof entry === "object" && entry.public });
  let result;
  try {
    await page.goto(BASE + route, { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200); // let lazy chunks / suspense settle
    const finalUrl = page.url().replace(BASE, "");
    const heading = await page.evaluate(() =>
      (document.querySelector("h1, h2, [class*='title']")?.textContent || document.title || "").trim().slice(0, 60));
    result = { route, finalUrl, heading, ...(await page.evaluate(probe)) };
  } catch (e) {
    result = { route, error: e.message.split("\n")[0] };
  }
  report.push(result);
  await page.close();
}

await browser.close();

// ── Report ────────────────────────────────────────────────────────────────
console.log(`\nHorizontal overflow audit @ ${VIEWPORT.width}x${VIEWPORT.height}  (base: ${BASE})`);
console.log("=".repeat(78));
for (const r of report) {
  const redirected = r.finalUrl && r.finalUrl !== r.route ? `  →  ${r.finalUrl}` : "";
  console.log(`\n${r.route}${redirected}   ${r.heading ? `[${r.heading}]` : ""}`);
  if (r.error) {
    console.log(`  ⚠️ could not audit: ${r.error}`);
    continue;
  }
  if (r.offenders.length === 0) {
    // Ground truth: even with the scroll-container skip, real page overflow
    // always shows up as document scrollWidth > clientWidth.
    if (r.docScrollWidth > r.vw + 2) {
      console.log(`  ❌ page scrolls horizontally (document scrollWidth ${r.docScrollWidth} > viewport ${r.vw}) but no element flagged — investigate`);
      continue;
    }
    console.log("  ✅ no overflow");
    continue;
  }
  const sorted = [...r.offenders].sort((a, b) => spill(b, r.vw) - spill(a, r.vw));
  console.log(`  ❌ ${sorted.length} offending element(s)  (viewport clientWidth=${r.vw})`);
  console.log(`     ${pad("spill", 7)}${pad("tag", 10)}${pad("left", 8)}${pad("right", 8)}${pad("width", 8)}class`);
  for (const o of sorted) {
    console.log(`     ${pad(spill(o, r.vw) + "px", 7)}${pad(o.tag, 10)}${pad(o.left, 8)}${pad(o.right, 8)}${pad(o.width, 8)}${o.cls || "(none)"}`);
  }
}
console.log("\n" + "=".repeat(78));
const bad = report.filter((r) => r.offenders?.length > 0).length;
console.log(`${report.length} routes audited — ${report.length - bad - report.filter((r) => r.error).length} clean, ${bad} with overflow, ${report.filter((r) => r.error).length} errored\n`);
