// src/api/questions.js
// Thin API wrappers for question pool endpoints.
// Keep deterministic: return backend payload as-is (no client shaping).
// apiClient.js handles auth headers, refresh, and error normalization.

import { apiGet } from "../apiClient";

/**
 * GET /v1/questions/pool
 * Fetches the full question pool used for deterministic selection.
 *
 * Expected return:
 * { questions: [...] } OR [...] depending on backend contract.
 * UI code should treat it as backend-owned.
 */
export async function getQuestionPool() {
  return apiGet("/v1/questions/pool");
}

/**
 * GET /v1/questions/{question_id}
 * Fetches a single question (optional utility).
 */
export async function getQuestion(questionId) {
  if (!questionId) throw new Error("questionId is required");
  return apiGet(`/v1/questions/${questionId}`);
}
