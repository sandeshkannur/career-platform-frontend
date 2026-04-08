// src/api/adminAnalytics.js
import { apiGet } from "../apiClient";

export async function getPlatformAnalytics() {
  return apiGet("/v1/admin-analytics/platform");
}
