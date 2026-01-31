# backend/tests/test_pr18_report_builder_unit.py

import pytest
from datetime import datetime

from app.services import report_builder
from app import schemas


def test_extract_display_lists_allowlist_only():
    rc = [
        {"career_id": 123, "career_name": "Engineer", "score": 98.0},  # score must not leak
        {"title": "Doctor", "weight": 0.9},                           # weight must not leak
        {"name": "Designer", "cluster_name": "Creative Arts"},
        {"career_name": "career_id:999"},                             # should be skipped (forbidden token)
        "Lawyer",
        {"items": [{"title": "Pilot"}]},                              # nested shape should work
    ]

    clusters, careers = report_builder.extract_display_lists_from_recommended_careers(rc)

    assert "Creative Arts" in clusters
    assert "Engineer" in careers
    assert "Doctor" in careers
    assert "Designer" in careers
    assert "Lawyer" in careers
    assert "Pilot" in careers


def test_normalize_locale():
    assert report_builder.normalize_locale("en-US") == "en"
    assert report_builder.normalize_locale("EN") == "en"
    assert report_builder.normalize_locale("kn") == "kn-IN"
    assert report_builder.normalize_locale("kn-IN") == "kn-IN"
    assert report_builder.normalize_locale("  kn_IN  ") == "kn-IN"


def test_student_safe_guard_raises_on_percent_leak():
    meta = schemas.ReportMeta(
        student_id=1,
        assessment_id=1,
        assessment_version="v1",
        scoring_config_version="v1",
        generated_at=datetime.utcnow(),
        locale="en",
        view="student",
    )

    doc = schemas.ReportDocument(
        report_meta=meta,
        sections=[
            schemas.ReportSection(
                type="bad",
                title="Bad Section",
                blocks=[schemas.ReportBlock(kind="paragraph", text="Your score is 95%")],
            )
        ],
    )

    with pytest.raises(ValueError):
        report_builder._assert_student_safe(doc)
