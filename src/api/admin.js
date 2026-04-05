/**
 * src/api/admin.js
 *
 * Admin API wrappers — thin clients over the backend /v1/admin/ endpoints.
 * No auth/token logic here — apiClient handles auth headers automatically.
 * No response shaping here — return backend payload as-is.
 *
 * SME Registry (ADM-B01):
 *   createSME       — POST   /v1/admin/sme
 *   listSMEs        — GET    /v1/admin/sme
 *   updateSME       — PUT    /v1/admin/sme/{id}
 *   deactivateSME   — DELETE /v1/admin/sme/{id}
 */

import { apiGet, apiPost, apiPut, apiDelete } from "../apiClient";

// ── SME Registry (ADM-B01) ────────────────────────────────────────────────

/**
 * Create a new SME profile.
 * POST /v1/admin/sme
 *
 * @param {Object} payload - SME data (full_name, email, career_assignments, etc.)
 * @returns {Object} Created SME profile with computed credentials_score
 */
export async function createSME(payload) {
  return apiPost("/v1/admin/sme", payload);
}

/**
 * List all SME profiles, optionally filtered by status.
 * GET /v1/admin/sme?status=active|inactive
 *
 * @param {string|null} status - "active", "inactive", or null for all
 * @returns {Array} List of SME profile objects
 */
export async function listSMEs(status = null) {
  const qs = status ? `?status=${status}` : "";
  return apiGet(`/v1/admin/sme${qs}`);
}

/**
 * Update an existing SME profile.
 * PUT /v1/admin/sme/{id}
 * Only send the fields you want to change — all fields are optional.
 * credentials_score is automatically recomputed by the backend.
 *
 * @param {number} smeId - SME profile ID
 * @param {Object} payload - Fields to update
 * @returns {Object} Updated SME profile
 */
export async function updateSME(smeId, payload) {
  if (!smeId) throw new Error("smeId is required");
  return apiPut(`/v1/admin/sme/${smeId}`, payload);
}

/**
 * Soft-deactivate an SME profile (sets status = inactive).
 * DELETE /v1/admin/sme/{id}
 * The row is never hard-deleted — audit trail is preserved.
 *
 * @param {number} smeId - SME profile ID
 * @returns {Object} Confirmation message
 */
export async function deactivateSME(smeId) {
  if (!smeId) throw new Error("smeId is required");
  return apiDelete(`/v1/admin/sme/${smeId}`);
}

// ── SME Submission Tokens (ADM-B02) ───────────────────────────────────────

/**
 * Generate a submission token for an SME+career pair.
 * POST /v1/admin/sme/{smeId}/tokens
 *
 * @param {number} smeId - SME profile ID
 * @param {Object} payload - { career_id, round_number, expires_days }
 * @returns {Object} Created token with URL
 */
export async function createSMEToken(smeId, payload) {
  if (!smeId) throw new Error("smeId is required");
  return apiPost(`/v1/admin/sme/${smeId}/tokens`, payload);
}

/**
 * List all submission tokens, optionally filtered by status.
 * GET /v1/admin/sme/tokens?status=pending|submitted|expired
 *
 * @param {string|null} status - "pending", "submitted", "expired", or null for all
 * @returns {Array} List of token objects
 */
export async function listSMETokens(status = null) {
  const qs = status ? `?status=${status}` : "";
  return apiGet(`/v1/admin/sme/tokens${qs}`);
}

/**
 * Admin manual submission fallback — submit ratings on behalf of SME.
 * POST /v1/admin/sme/submit
 *
 * @param {Object} payload - { token_id, aq_ratings, keyskill_ratings }
 * @returns {Object} Confirmation message
 */
export async function adminManualSubmit(payload) {
  return apiPost("/v1/admin/sme/submit", payload);
}
