-- PR13 Soft Reset (runtime-only)
-- Clears beta run data WITHOUT touching knowledge-pack or users.
-- Derived from FK graph (pr13_schema_probe.ps1).

BEGIN;

-- =========================================================
-- 1) Assessment runtime children (FK -> assessments)
-- Must be deleted before deleting from assessments.
-- =========================================================
DELETE FROM assessment_responses;
DELETE FROM assessment_results;
DELETE FROM student_skill_scores;
DELETE FROM assessment_questions;
DELETE FROM context_profile;      -- has FK to both assessments + students

-- =========================================================
-- 2) Assessments (parent)
-- =========================================================
DELETE FROM assessments;

-- =========================================================
-- 3) Student runtime children (FK -> students)
-- =========================================================
DELETE FROM student_keyskill_map;
DELETE FROM student_skill_map;
DELETE FROM student_analytics_summary;

-- Optional runtime logs (not part of knowledge pack)
DELETE FROM consent_logs;

-- =========================================================
-- 4) Students (keep users)
-- =========================================================
DELETE FROM students;

COMMIT;

-- =========================
-- Proof counts (pasteable)
-- =========================
SELECT 'assessments' AS table, COUNT(*) AS rows FROM assessments;
SELECT 'assessment_questions' AS table, COUNT(*) AS rows FROM assessment_questions;
SELECT 'assessment_responses' AS table, COUNT(*) AS rows FROM assessment_responses;
SELECT 'assessment_results' AS table, COUNT(*) AS rows FROM assessment_results;
SELECT 'student_skill_scores' AS table, COUNT(*) AS rows FROM student_skill_scores;
SELECT 'context_profile' AS table, COUNT(*) AS rows FROM context_profile;

SELECT 'students' AS table, COUNT(*) AS rows FROM students;
SELECT 'student_skill_map' AS table, COUNT(*) AS rows FROM student_skill_map;
SELECT 'student_keyskill_map' AS table, COUNT(*) AS rows FROM student_keyskill_map;
SELECT 'student_analytics_summary' AS table, COUNT(*) AS rows FROM student_analytics_summary;
SELECT 'consent_logs' AS table, COUNT(*) AS rows FROM consent_logs;

-- Knowledge pack must remain (spot-check)
SELECT 'career_clusters' AS table, COUNT(*) AS rows FROM career_clusters;
SELECT 'careers' AS table, COUNT(*) AS rows FROM careers;
SELECT 'keyskills' AS table, COUNT(*) AS rows FROM keyskills;
SELECT 'skills' AS table, COUNT(*) AS rows FROM skills;
SELECT 'questions' AS table, COUNT(*) AS rows FROM questions;

-- Identity must remain (spot-check)
SELECT 'users' AS table, COUNT(*) AS rows FROM users;
