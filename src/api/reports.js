// src/api/reports.js
// Thin API wrappers for report endpoints.
// Keep deterministic: return backend payload as-is (no UI shaping here).

import { apiGet } from "../apiClient";
import { getToken, setToken, apiBase } from "../auth";

/**
 * GET /v1/reports/{student_id}
 * Fetches the student's generated report JSON.
 *
 * NOTE:
 * - Backend may return 404 if report is not ready yet.
 * - UI will handle that later (Step: UX polish).
 */
export async function getStudentReport(studentId) {
  if (!studentId) throw new Error("studentId is required");
  return apiGet(`/v1/reports/${studentId}`);
}

// ── PDF scorecard download ────────────────────────────────────────────────
// apiClient's apiRequest parses bodies as JSON/text, so the binary PDF goes
// through a plain fetch here — same base URL (auth.apiBase), same bearer
// token (sessionStorage via auth.getToken), same one-refresh-then-retry
// policy on 401 as apiClient.

async function refreshAccessToken() {
  try {
    const res = await fetch(`${apiBase()}/v1/auth/refresh`, {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "include", // HttpOnly cookie holds the refresh token
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const newToken = data?.access_token;
    if (!newToken) return null;
    setToken(newToken);
    return newToken;
  } catch {
    return null;
  }
}

function filenameFromContentDisposition(header) {
  if (!header) return null;
  // RFC 5987 form (filename*=UTF-8''...) wins over the plain form
  const star = header.match(/filename\*\s*=\s*(?:UTF-8'')?"?([^";]+)"?/i);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      // malformed percent-encoding — fall through to the plain form
    }
  }
  const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain?.[1]?.trim() || null;
}

/**
 * GET /v1/reports/scorecard/{student_id}?format=pdf&locale={locale}
 * Fetches the PDF scorecard and triggers a browser download.
 * Tier gating (free=5 careers, paid=9) is applied server-side.
 *
 * Throws an Error with `.status` on any non-OK response so callers can
 * surface a user-facing message.
 */
export async function downloadScorecardPdf(studentId, locale = "en") {
  if (!studentId) throw new Error("studentId is required");

  const url = `${apiBase()}/v1/reports/scorecard/${studentId}?format=pdf&locale=${encodeURIComponent(
    locale || "en"
  )}`;

  const fetchPdf = (token) =>
    fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/pdf",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });

  let res = await fetchPdf(getToken());

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      const err = new Error("Your session has expired. Please log in again.");
      err.status = 401;
      throw err;
    }
    res = await fetchPdf(newToken);
  }

  if (!res.ok) {
    let detail = null;
    try {
      const body = await res.json();
      detail = body?.detail || body?.message || null;
    } catch {
      // non-JSON error body — use the generic message
    }
    const err = new Error(
      (typeof detail === "string" && detail) ||
        `Report download failed (${res.status})`
    );
    err.status = res.status;
    throw err;
  }

  const blob = await res.blob();
  const filename =
    filenameFromContentDisposition(res.headers.get("content-disposition")) ||
    `career-report-${studentId}.pdf`;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
