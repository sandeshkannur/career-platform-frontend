// src/api/adminAnalytics.js
import { apiGet } from "../apiClient";

export async function getPlatformAnalytics() {
  return apiGet("/v1/admin-analytics/platform");
}

export async function getStudentAnalytics(studentId) {
  return apiGet(`/v1/admin-student-analytics/${studentId}`);
}

export async function getAQInfluence(studentId) {
  return apiGet(`/v1/student-graph-analytics/${studentId}/aq-influence`);
}

export async function getWhatIf(studentId, aqCode, delta) {
  return apiGet(`/v1/student-graph-analytics/${studentId}/whatif?aq_code=${aqCode}&delta=${delta}`);
}

export async function getReachability(studentId) {
  return apiGet(`/v1/student-graph-analytics/${studentId}/reachability`);
}

export async function getCareerPathway(studentId, careerTitle) {
  return apiGet(`/v1/student-graph-analytics/${studentId}/pathway?career=${encodeURIComponent(careerTitle)}`);
}
