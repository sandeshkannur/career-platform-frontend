# backend/app/services/knowledge_pack_validation.py

from datetime import datetime
from typing import List

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models import (
    CareerCluster,
    Career,
    KeySkill,
    AssociatedQuality,
    AQFacet,
    QuestionFacetTag,
    Question,
    career_keyskill_association,
)
from app.schemas import (
    ValidateKnowledgePackResponse,
    KnowledgePackStat,
    KnowledgePackIssue,
)


def run_validate_knowledge_pack(db: Session) -> ValidateKnowledgePackResponse:
    # <-- paste the entire old admin.py endpoint BODY here
    # It must end with:
    # return ValidateKnowledgePackResponse(...)
    ...
    stats: List[KnowledgePackStat] = []
    issues: List[KnowledgePackIssue] = []

    def add_count(table_name: str, count_value: int):
        stats.append(KnowledgePackStat(table=table_name, rows=count_value))

    clusters_count = db.query(CareerCluster).count()
    careers_count = db.query(Career).count()
    keyskills_count = db.query(KeySkill).count()

    add_count("career_clusters", clusters_count)
    add_count("careers", careers_count)
    add_count("keyskills", keyskills_count)

    # ---- Mapping counts (association table) ----
    ck_count = db.execute(
        select(func.count()).select_from(career_keyskill_association)
    ).scalar_one()
    add_count("career_keyskill_association", int(ck_count))

    # ---- AQ/Facet/Questions layer (if present) ----
    try:
        aqs_count = db.query(AssociatedQuality).count()
        add_count("associated_qualities", aqs_count)
    except Exception:
        pass

    try:
        aq_facets_count = db.query(AQFacet).count()
        add_count("aq_facets", aq_facets_count)
    except Exception:
        pass

    try:
        questions_count = db.query(Question).count()
        add_count("questions", questions_count)
    except Exception:
        pass

    try:
        qft_count = db.query(QuestionFacetTag).count()
        add_count("question_facet_tags", int(qft_count))
    except Exception:
        pass

    try:
        aq_ss_weights_count = db.execute(
            text("SELECT COUNT(*) FROM aq_student_skill_weights")
        ).scalar() or 0
        add_count("aq_student_skill_weights", int(aq_ss_weights_count))
    except Exception:
        pass

    # ---- Minimal “empty table” issues (optional but useful) ----
    # Keep language neutral & supportive; no “red/green” semantics.
    if clusters_count == 0:
        issues.append(
            KnowledgePackIssue(
                code="clusters.empty",
                severity="warning",
                message="No career clusters found. This usually means the knowledge pack has not been ingested yet.",
            )
        )
    if careers_count == 0:
        issues.append(
            KnowledgePackIssue(
                code="careers.empty",
                severity="warning",
                message="No careers found. This usually means the knowledge pack has not been ingested yet.",
            )
        )
    if keyskills_count == 0:
        issues.append(
            KnowledgePackIssue(
                code="keyskills.empty",
                severity="warning",
                message="No key skills found. This usually means the knowledge pack has not been ingested yet.",
            )
        )
    if int(ck_count) == 0 and (careers_count > 0 and keyskills_count > 0):
        issues.append(
            KnowledgePackIssue(
                code="career_keyskill_map.empty",
                severity="warning",
                message="No Career ↔ KeySkill mappings found. Recommendations may be incomplete until mappings are uploaded.",
            )
        )
    if "questions_count" in locals() and questions_count > 0:
        if "qft_count" in locals() and int(qft_count) == 0:
            issues.append(
                KnowledgePackIssue(
                    code="question_facet_tags.missing",
                    severity="warning",
                    message="No Question ↔ Facet tags found. AQ/Facet explainability will be limited until facet tagging is uploaded.",
                )
            )

    # If facet tags exist, check coverage: unused facets and untagged questions
    try:
        if "qft_count" in locals() and int(qft_count) > 0:
            # Facets that exist but are never used by any question
            unused_facets_count = db.execute(
                text(
                    """
                    SELECT COUNT(*) AS cnt
                    FROM aq_facets f
                    LEFT JOIN question_facet_tags qft ON qft.facet_id = f.facet_id
                    WHERE qft.facet_id IS NULL
                    """
                )
            ).scalar() or 0

            unused_facets_examples = db.execute(
                text(
                    """
                    SELECT f.facet_id, f.aq_id, f.facet_name
                    FROM aq_facets f
                    LEFT JOIN question_facet_tags qft ON qft.facet_id = f.facet_id
                    WHERE qft.facet_id IS NULL
                    ORDER BY f.aq_id, f.facet_id
                    LIMIT 2
                    """
                )
            ).mappings().all()

            if int(unused_facets_count) > 0:
                issues.append(
                    KnowledgePackIssue(
                        code="aq_facets.unused",
                        severity="warning",
                        message="Some facets are not linked to any question. These facets may not appear in explainability until question tagging is added.",
                        sample={"examples": [dict(r) for r in unused_facets_examples]},
                    )
                )

            # Questions that exist but have no facet tags
            untagged_questions_count = db.execute(
                text(
                    """
                    SELECT COUNT(*) AS cnt
                    FROM questions q
                    LEFT JOIN question_facet_tags qft ON qft.question_id = q.id
                    WHERE qft.question_id IS NULL
                    """
                )
            ).scalar() or 0

            untagged_questions_examples = db.execute(
                text(
                    """
                    SELECT q.id AS question_id, q.assessment_version, q.question_code
                    FROM questions q
                    LEFT JOIN question_facet_tags qft ON qft.question_id = q.id
                    WHERE qft.question_id IS NULL
                    ORDER BY q.assessment_version, q.id
                    LIMIT 2
                    """
                )
            ).mappings().all()

            if int(untagged_questions_count) > 0:
                issues.append(
                    KnowledgePackIssue(
                        code="questions.missing_facet_tags",
                        severity="warning",
                        message="Some questions have no facet tags. AQ/Facet explainability may be incomplete for these questions until they are tagged.",
                        sample={"examples": [dict(r) for r in untagged_questions_examples]},
                    )
                )
    except Exception:
        pass

    # Careers without a valid career cluster (FK: careers.cluster_id -> career_clusters.id)
    try:
        orphan_careers = (
            db.query(Career.id, Career.title, Career.cluster_id)
            .outerjoin(CareerCluster, Career.cluster_id == CareerCluster.id)
            .filter((Career.cluster_id == None) | (CareerCluster.id == None))
            .limit(2)
            .all()
        )

        orphan_careers_count = (
            db.query(func.count(Career.id))
            .outerjoin(CareerCluster, Career.cluster_id == CareerCluster.id)
            .filter((Career.cluster_id == None) | (CareerCluster.id == None))
            .scalar()
            or 0
        )

        if int(orphan_careers_count) > 0:
            issues.append(
                KnowledgePackIssue(
                    code="careers.orphan_cluster",
                    severity="warning",
                    message="Some careers are not linked to a valid career cluster. These careers may be excluded from cluster-level insights until the linkage is fixed.",
                    sample={
                        "examples": [
                            {
                                "career_id": c.id,
                                "career_title": c.title,
                                "cluster_id": c.cluster_id,
                            }
                            for c in orphan_careers
                        ]
                    },
                )
            )
    except Exception:
        pass
    except Exception:
        pass

    # Careers with zero linked keyskills (career_keyskill_association)
    try:
        careers_missing_keyskills = (
            db.query(Career.career_id, Career.career_name)
            .outerjoin(
                career_keyskill_association,
                Career.career_id == career_keyskill_association.c.career_id,
            )
            .filter(career_keyskill_association.c.career_id == None)
            .limit(2)
            .all()
        )

        careers_missing_keyskills_count = (
            db.query(func.count(Career.career_id))
            .outerjoin(
                career_keyskill_association,
                Career.career_id == career_keyskill_association.c.career_id,
            )
            .filter(career_keyskill_association.c.career_id == None)
            .scalar()
            or 0
        )

        if int(careers_missing_keyskills_count) > 0:
            issues.append(
                KnowledgePackIssue(
                    code="careers.missing_keyskills",
                    severity="warning",
                    message="Some careers have no linked key skills. Recommendations and explainability may be incomplete for these careers until mappings are added.",
                    sample={
                        "examples": [
                            {
                                "career_id": c.career_id,
                                "career_name": c.career_name,
                            }
                            for c in careers_missing_keyskills
                        ]
                    },
                )
            )
    except Exception:
        pass

        # Careers with zero linked keyskills (career_keyskill_association)
    try:
        careers_missing_keyskills = (
            db.query(Career.id, Career.title)
            .outerjoin(
                career_keyskill_association,
                Career.id == career_keyskill_association.c.career_id,
            )
            .filter(career_keyskill_association.c.career_id == None)
            .limit(2)
            .all()
        )

        careers_missing_keyskills_count = (
            db.query(func.count(Career.id))
            .outerjoin(
                career_keyskill_association,
                Career.id == career_keyskill_association.c.career_id,
            )
            .filter(career_keyskill_association.c.career_id == None)
            .scalar()
            or 0
        )

        if int(careers_missing_keyskills_count) > 0:
            issues.append(
                KnowledgePackIssue(
                    code="careers.missing_keyskills",
                    severity="warning",
                    message="Some careers have no linked key skills. Recommendations and explainability may be incomplete for these careers until mappings are added.",
                    sample={
                        "examples": [
                            {
                                "career_id": c.id,
                                "career_title": c.title,
                            }
                            for c in careers_missing_keyskills
                        ]
                    },
                )
            )
    except Exception:
        pass
        # KeySkills with zero linked careers (career_keyskill_association)
    try:
        keyskills_missing_careers_count = db.execute(
            text(
                """
                SELECT COUNT(*) AS cnt
                FROM keyskills ks
                LEFT JOIN career_keyskill_association ck
                  ON ks.id = ck.keyskill_id
                WHERE ck.keyskill_id IS NULL
                """
            )
        ).scalar() or 0

        keyskills_missing_careers_examples = db.execute(
            text(
                """
                SELECT ks.id AS keyskill_id, ks.name AS keyskill_name, ks.cluster_id
                FROM keyskills ks
                LEFT JOIN career_keyskill_association ck
                  ON ks.id = ck.keyskill_id
                WHERE ck.keyskill_id IS NULL
                ORDER BY ks.id
                LIMIT 2
                """
            )
        ).mappings().all()

        keyskills_missing_careers_examples = [dict(r) for r in keyskills_missing_careers_examples]

        if int(keyskills_missing_careers_count) > 0:
            issues.append(
                KnowledgePackIssue(
                    code="keyskills.missing_careers",
                    severity="warning",
                    message="Some key skills are not linked to any career. These key skills may not contribute to recommendations until mappings are added.",
                    sample={"examples": keyskills_missing_careers_examples},
                )
            )
    except Exception:
        pass

    # Career ↔ KeySkill mappings with missing weights (weight_percentage IS NULL)
    try:
        missing_weights_count = db.execute(
            text(
                """
                SELECT COUNT(*) AS cnt
                FROM career_keyskill_association
                WHERE weight_percentage IS NULL
                """
            )
        ).scalar() or 0

        missing_weights_examples = db.execute(
            text(
                """
                SELECT career_id, keyskill_id
                FROM career_keyskill_association
                WHERE weight_percentage IS NULL
                ORDER BY career_id, keyskill_id
                LIMIT 2
                """
            )
        ).mappings().all()

        missing_weights_examples = [dict(r) for r in missing_weights_examples]

        if int(missing_weights_count) > 0:
            issues.append(
                KnowledgePackIssue(
                    code="career_keyskill_weights.missing",
                    severity="warning",
                    message="Some Career ↔ KeySkill mappings have no weight set. These mappings may not behave as intended until weights are provided.",
                    sample={"examples": missing_weights_examples},
                )
            )
    except Exception:
        pass

    # Career ↔ KeySkill weight sum sanity (SUM(weight_percentage) != 100, ignoring NULLs)
    try:
        sum_not_100_count = db.execute(
            text(
                """
                SELECT COUNT(*) AS cnt
                FROM (
                    SELECT career_id, SUM(weight_percentage) AS sum_weight
                    FROM career_keyskill_association
                    WHERE weight_percentage IS NOT NULL
                    GROUP BY career_id
                ) t
                WHERE t.sum_weight <> 100
                """
            )
        ).scalar() or 0

        sum_not_100_examples = db.execute(
            text(
                """
                SELECT career_id, SUM(weight_percentage) AS sum_weight
                FROM career_keyskill_association
                WHERE weight_percentage IS NOT NULL
                GROUP BY career_id
                HAVING SUM(weight_percentage) <> 100
                ORDER BY career_id
                LIMIT 2
                """
            )
        ).mappings().all()

        sum_not_100_examples = [dict(r) for r in sum_not_100_examples]

        if int(sum_not_100_count) > 0:
            issues.append(
                KnowledgePackIssue(
                    code="career_keyskill_weights.sum_not_100",
                    severity="warning",
                    message="Some careers have Career ↔ KeySkill weights that do not add up to 100. Weight distribution may need review for consistent interpretation.",
                    sample={"examples": sum_not_100_examples},
                )
            )
    except Exception:
        pass

    # Careers with Career ↔ KeySkill links but no non-null weights at all
    try:
        all_null_weights_count = db.execute(
            text(
                """
                SELECT COUNT(*) AS cnt
                FROM (
                    SELECT
                        career_id,
                        COUNT(*) AS total_links,
                        COUNT(weight_percentage) AS non_null_weights
                    FROM career_keyskill_association
                    GROUP BY career_id
                ) t
                WHERE t.total_links > 0 AND t.non_null_weights = 0
                """
            )
        ).scalar() or 0

        all_null_weights_examples = db.execute(
            text(
                """
                SELECT
                    career_id,
                    COUNT(*) AS total_links,
                    COUNT(weight_percentage) AS non_null_weights
                FROM career_keyskill_association
                GROUP BY career_id
                HAVING COUNT(*) > 0 AND COUNT(weight_percentage) = 0
                ORDER BY career_id
                LIMIT 2
                """
            )
        ).mappings().all()

        all_null_weights_examples = [dict(r) for r in all_null_weights_examples]

        if int(all_null_weights_count) > 0:
            issues.append(
                KnowledgePackIssue(
                    code="career_keyskill_weights.all_null",
                    severity="warning",
                    message="Some careers have Career ↔ KeySkill links but no weights set on any link. Weight distribution may need completion for consistent interpretation.",
                    sample={"examples": all_null_weights_examples},
                )
            )
    except Exception:
        pass

    # If facet tags exist, check coverage: unused facets and untagged questions.
    try:
        if "qft_count" in locals() and int(qft_count) > 0:
            # Facets that are never referenced by any question_facet_tags row
            unused_facets_count = db.execute(
                text(
                    """
                    SELECT COUNT(*) AS cnt
                    FROM aq_facets f
                    LEFT JOIN question_facet_tags qft ON qft.facet_id = f.facet_id
                    WHERE qft.facet_id IS NULL
                    """
                )
            ).scalar() or 0

            unused_facets_examples = db.execute(
                text(
                    """
                    SELECT f.facet_id, f.aq_id, f.facet_name
                    FROM aq_facets f
                    LEFT JOIN question_facet_tags qft ON qft.facet_id = f.facet_id
                    WHERE qft.facet_id IS NULL
                    ORDER BY f.aq_id, f.facet_id
                    LIMIT 2
                    """
                )
            ).mappings().all()

            if int(unused_facets_count) > 0:
                issues.append(
                    KnowledgePackIssue(
                        code="aq_facets.unused",
                        severity="warning",
                        message="Some facets are not linked to any question. These facets may not appear in explainability until question tagging is added.",
                        sample={"examples": [dict(r) for r in unused_facets_examples]},
                    )
                )

            # Questions that have no facet tags at all
            untagged_questions_count = db.execute(
                text(
                    """
                    SELECT COUNT(*) AS cnt
                    FROM questions q
                    LEFT JOIN question_facet_tags qft ON qft.question_id = q.id
                    WHERE qft.question_id IS NULL
                    """
                )
            ).scalar() or 0

            untagged_questions_examples = db.execute(
                text(
                    """
                    SELECT q.id AS question_id, q.assessment_version, q.question_code
                    FROM questions q
                    LEFT JOIN question_facet_tags qft ON qft.question_id = q.id
                    WHERE qft.question_id IS NULL
                    ORDER BY q.assessment_version, q.id
                    LIMIT 2
                    """
                )
            ).mappings().all()

            if int(untagged_questions_count) > 0:
                issues.append(
                    KnowledgePackIssue(
                        code="questions.missing_facet_tags",
                        severity="warning",
                        message="Some questions have no facet tags. AQ/Facet explainability may be incomplete for these questions until they are tagged.",
                        sample={"examples": [dict(r) for r in untagged_questions_examples]},
                    )
                )
    except Exception:
        pass

    status = "ok" if len(issues) == 0 else "has_issues"

    return ValidateKnowledgePackResponse(
        status=status,
        generated_at=datetime.utcnow(),
        stats=stats,
        issues=issues,
    )
