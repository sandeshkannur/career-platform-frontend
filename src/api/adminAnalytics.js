// src/api/adminAnalytics.js
import { apiGet, apiPatch, apiPost } from "../apiClient";

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

// Admin portal API functions
export async function getAdminClusters() {
  return apiGet('/v1/admin-portal/career-clusters');
}

export async function getAdminCareers(params = {}) {
  const q = new URLSearchParams();
  if (params.cluster_id) q.set('cluster_id', params.cluster_id);
  if (params.is_active !== undefined) q.set('is_active', params.is_active);
  if (params.tier) q.set('tier', params.tier);
  if (params.search) q.set('search', params.search);
  if (params.page) q.set('page', params.page);
  if (params.page_size) q.set('page_size', params.page_size);
  return apiGet(`/v1/admin-portal/careers?${q.toString()}`);
}

export async function getAdminCareerDetail(careerId) {
  return apiGet(`/v1/admin-portal/careers/${careerId}`);
}

export async function updateCareerTier(careerId, body) {
  return apiPatch(`/v1/admin-portal/careers/${careerId}/tier`, body);
}

export async function getAdminKeySkills(params = {}) {
  const q = new URLSearchParams();
  if (params.cluster_id) q.set('cluster_id', params.cluster_id);
  if (params.search) q.set('search', params.search);
  return apiGet(`/v1/admin-portal/key-skills?${q.toString()}`);
}

export async function getMappingHealth() {
  return apiGet('/v1/admin-portal/mappings/health');
}

export async function getCareerSkillWeights(careerId) {
  return apiGet(`/v1/admin-portal/mappings/career-skill-weights?career_id=${careerId}`);
}

// Individual record creation
export async function createCluster(body) {
  return apiPost('/v1/admin-portal/career-clusters', body);
}

export async function createCareer(body) {
  return apiPost('/v1/admin-portal/careers', body);
}

export async function createKeySkill(body) {
  return apiPost('/v1/admin-portal/key-skills', body);
}

export async function createMapping(body) {
  return apiPost('/v1/admin-portal/mappings/career-keyskill', body);
}

// Student skills
export async function getAdminStudentSkills() {
  return apiGet('/v1/admin-portal/student-skills');
}

export async function updateStudentSkillDisplayName(skillId, body) {
  return apiPatch(`/v1/admin-portal/student-skills/${skillId}`, body);
}
