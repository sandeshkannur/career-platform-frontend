from sqlalchemy.orm import Session
from app import models
from collections import defaultdict

def compute_skill_scores(assessment_id: int, db: Session, dataset_version: str = "v1") -> dict:
    """
    Deterministic scoring:
    Priority 1: question_student_skill_map (many-to-many question -> student skill)
    Fallback: questions.skill_id (legacy single-skill mapping)

    Note: Keeps existing API behavior; dataset_version defaults to 'v1'.
    """
    responses = db.query(models.AssessmentResponse).filter_by(assessment_id=assessment_id).all()
    skill_scores = defaultdict(float)

    for response in responses:
        # Answer is expected to be numeric (e.g. 0/1/2/3). Default to 1 if empty.
        try:
            score = float(response.answer) if response.answer is not None else 1.0
        except Exception:
            score = 1.0

        # ✅ Priority 1: Use question_student_skill_map if present
        mappings = (
            db.query(models.QuestionStudentSkillMap)
              .filter_by(question_id=response.question_id, dataset_version=dataset_version)
              .all()
        )

        if mappings:
            for m in mappings:
                # weight is stored on mapping table
                skill_scores[m.skill_id] += score * float(m.weight)
            continue

        # ✅ Fallback: legacy single-skill mapping on questions table
        question = db.query(models.Question).get(response.question_id)
        if question:
            skill_scores[question.skill_id] += score * float(getattr(question, "weight", 1) or 1)

    return dict(skill_scores)

def assign_tiers(skill_scores: dict) -> dict:
    tiers = {}
    for skill_id, score in skill_scores.items():
        if score >= 8:
            tiers[skill_id] = "High"
        elif score >= 4:
            tiers[skill_id] = "Medium"
        else:
            tiers[skill_id] = "Low"
    return tiers
    
def compute_hsi_v1(raw_skill_score: float, cps_score: float) -> float:
    """
    Hybrid Suitability Index (HSI) v1

    Rule (locked):
        FinalScore = RawSkillScore * (1 + (CPS * 0.15 / 100))

    Pure + deterministic:
      - No DB access
      - No side effects
      - Defensive on bad inputs
    """
    try:
        raw = float(raw_skill_score)
    except (TypeError, ValueError):
        raw = 0.0

    try:
        cps = float(cps_score)
    except (TypeError, ValueError):
        cps = 0.0

    # Defensive clamping (keeps replayability stable)
    if raw < 0.0:
        raw = 0.0
    if cps < 0.0:
        cps = 0.0
    if cps > 100.0:
        cps = 100.0

    multiplier = 1.0 + (cps * 0.15 / 100.0)
    return raw * multiplier

def compute_skill_scores_hsi_v1(
    assessment_id: int,
    db: Session,
    dataset_version: str = "v1",
) -> dict:
    """
    HSI-upgraded scoring (v1):
      1) Compute raw skill scores using existing deterministic method
      2) Fetch CPS from context_profile (assessment_id 1:1)
      3) Apply compute_hsi_v1 per skill score

    Additive: does not change existing compute_skill_scores callers until wired.
    """
    # 1) Raw skill scores (existing logic)
    raw_scores = compute_skill_scores(
        assessment_id=assessment_id,
        db=db,
        dataset_version=dataset_version,
    )

    # 2) Fetch CPS (must exist for HSI path)
    context = (
        db.query(models.ContextProfile)
        .filter_by(assessment_id=assessment_id)
        .first()
    )

    # If CPS is missing, keep behavior safe and deterministic: treat CPS as 0
    cps_score = float(getattr(context, "cps_score", 0.0) or 0.0)

    # 3) Apply HSI per skill
    hsi_scores = {}
    for skill_id, raw in raw_scores.items():
        hsi_scores[skill_id] = compute_hsi_v1(raw, cps_score)

    return hsi_scores    
# =========================================================
# Context Profile Score (CPS) — Hybrid Model v1
# =========================================================

def compute_cps_v1(
    *,
    ses_band: str,
    education_board: str,
    support_level: str,
) -> float:
    """
    Compute Context Profile Score (CPS) on a 0–100 scale.

    Deterministic, explainable, versioned.
    No DB access. No side effects.
    """

    # --- Normalization maps (v1 locked) ---

    ses_map = {
        "EWS": 0.40,
        "LIG": 0.55,
        "MIG": 0.75,
        "HIG": 0.90,
    }

    board_map = {
        "State": 0.55,
        "CBSE": 0.75,
        "ICSE": 0.80,
        "International": 0.90,
    }

    support_map = {
        "Low": 0.50,
        "Medium": 0.75,
        "High": 0.95,
    }

    # --- Safe defaults (psychological safety) ---
    ses_score = ses_map.get(ses_band, 0.60)
    board_score = board_map.get(education_board, 0.65)
    support_score = support_map.get(support_level, 0.65)

    # --- Weighted CPS ---
    cps_normalized = (
        (ses_score * 0.40)
        + (board_score * 0.30)
        + (support_score * 0.30)
    )

    # Scale to 0–100
    cps_scaled = round(cps_normalized * 100, 2)

    return cps_scaled