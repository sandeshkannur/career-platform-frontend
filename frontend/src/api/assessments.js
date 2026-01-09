// src/api/assessments.js
// Thin API wrappers for assessment lifecycle.
// Backend behavior is LOCKED. No auth / token logic here.
// apiClient.js handles headers, refresh, and errors.

import { apiGet, apiPost } from "../apiClient";

/**
 * POST /v1/assessments/start
 * Creates a new assessment run for the current student.
 *
 * Returns:
 * { assessment_id, status, started_at, snapshot? }
 */
export async function startAssessment(payload = {}) {
  return apiPost("/v1/assessments/start", payload);
}

/**
 * GET /v1/assessments/{assessment_id}
 * Fetches assessment metadata + snapshot for resume flow.
 */
export async function getAssessment(assessmentId) {
  if (!assessmentId) throw new Error("assessmentId is required");
  return apiGet(`/v1/assessments/${assessmentId}`);
}

/**
 * POST /v1/assessments/{assessment_id}/submit
 * Submits completed responses for scoring.
 */
export async function submitAssessment(assessmentId, payload) {
  if (!assessmentId) throw new Error("assessmentId is required");
  if (!payload) throw new Error("payload is required");
  return apiPost(`/v1/assessments/${assessmentId}/submit`, payload);
}
