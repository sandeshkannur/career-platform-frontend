WITH missing AS (
  SELECT
    q.id AS question_id,
    q.assessment_version,
    q.question_code,
    -- Convert 'AQ01' -> 'AQ_01' to match aq_student_skill_weights.aq_code
    regexp_replace(split_part(q.question_code, '_', 1), '^AQ([0-9]{2})$', 'AQ_\1') AS aq_code_norm
  FROM questions q
  LEFT JOIN question_student_skill_weights w ON w.question_id = q.id
  WHERE w.id IS NULL
),
aq_sum AS (
  SELECT
    assessment_version,
    aq_code,
    SUM(weight) AS sum_w
  FROM aq_student_skill_weights
  WHERE status = 'active'
  GROUP BY assessment_version, aq_code
),
src AS (
  SELECT
    m.question_id,
    a.skill_id,
    CASE
      WHEN s.sum_w IS NULL OR s.sum_w = 0 THEN NULL
      ELSE (a.weight / s.sum_w)
    END AS norm_weight
  FROM missing m
  JOIN aq_student_skill_weights a
    ON a.assessment_version = m.assessment_version
   AND a.aq_code = m.aq_code_norm
   AND a.status = 'active'
  JOIN aq_sum s
    ON s.assessment_version = a.assessment_version
   AND s.aq_code = a.aq_code
)
INSERT INTO question_student_skill_weights (question_id, skill_id, weight, source)
SELECT
  question_id,
  skill_id,
  norm_weight,
  'AQSS_v1 (AQ→StudentSkill weights)'
FROM src
WHERE norm_weight IS NOT NULL
ON CONFLICT (question_id, skill_id)
DO UPDATE SET
  weight = EXCLUDED.weight,
  source = EXCLUDED.source;
