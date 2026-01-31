# backend/tests/test_pr18_reports_api.py

from types import SimpleNamespace
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.deps import get_db
from app.auth.auth import get_current_active_user


# -----------------------------
# Minimal DB stubs
# -----------------------------

class DummyDB:
    """
    Minimal DB stub that supports:
      db.query(models.Student).filter(...).first()
    Used to trigger ownership paths deterministically.
    """
    def __init__(self, *, student_id: int, student_user_id: int):
        self.student_id = student_id
        self.student_user_id = student_user_id

    def query(self, model):
        self._model = model
        return self

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        # Student-like object used by router: id, user_id
        return SimpleNamespace(id=self.student_id, user_id=self.student_user_id)


# -----------------------------
# Fixtures
# -----------------------------

@pytest.fixture()
def client():
    return TestClient(app)


def override_user_student_owner():
    # student role, id=100
    return SimpleNamespace(id=100, role="student")


def override_user_admin():
    return SimpleNamespace(id=1, role="admin")


def override_db_student_owned():
    # student_id=4 belongs to user_id=100
    return DummyDB(student_id=4, student_user_id=100)


def override_db_student_not_owned():
    # student_id=5 belongs to user_id=999 (NOT user_id=100)
    return DummyDB(student_id=5, student_user_id=999)


# -----------------------------
# Tests
# -----------------------------

def test_pr18_pdf_deferred_returns_501(client, monkeypatch):
    """
    GET /v1/reports/scorecard/{id}?format=pdf -> 501
    Router should return before calling builder.
    """
    app.dependency_overrides[get_current_active_user] = override_user_student_owner
    app.dependency_overrides[get_db] = override_db_student_owned

    r = client.get("/v1/reports/scorecard/4?format=pdf")
    assert r.status_code == 501
    assert "PDF" in r.json()["detail"]

    app.dependency_overrides = {}


def test_pr18_student_cannot_access_other_student_returns_403(client):
    """
    Student tries to access someone else's student_id -> 403
    Router should fail before calling builder.
    """
    app.dependency_overrides[get_current_active_user] = override_user_student_owner
    app.dependency_overrides[get_db] = override_db_student_not_owned

    r = client.get("/v1/reports/scorecard/5?format=json")
    assert r.status_code == 403

    app.dependency_overrides = {}
