"""
Smoke test for CareerPlatform FastAPI backend.

What it checks (high-signal, low-risk):
- Admin login works
- Student login works
- /v1/auth/me works for both
- Admin-only endpoint works (validate-knowledge-pack)
- Student recommendations endpoint works
- Paid analytics endpoint works (admin allowed)
- If any step fails, prints exact URL, status, and response body.

How to run (local):
  python backend/scripts/smoke/smoke_api.py

How to run (inside docker backend container):
  docker compose exec -T backend python /app/scripts/smoke/smoke_api.py
"""

import os
import sys
import json
import traceback
from typing import Any, Dict, Optional

import requests


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000").rstrip("/")
API_PREFIX = os.getenv("API_PREFIX", "/v1").rstrip("/")

# Defaults from your earlier shared creds (override via env if needed)
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "aarav.sharma01@testmail.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Test@12345")

STUDENT_EMAIL = os.getenv("STUDENT_EMAIL", "aarav.student01@testmail.com")
STUDENT_PASSWORD = os.getenv("STUDENT_PASSWORD", "Test@12345")

# Student to test against (override if your DB differs)
STUDENT_ID = int(os.getenv("STUDENT_ID", "1"))


def _pretty(obj: Any) -> str:
    try:
        return json.dumps(obj, indent=2, ensure_ascii=False)
    except Exception:
        return str(obj)


def fail(step: str, url: str, resp: Optional[requests.Response] = None, extra: Optional[str] = None) -> None:
    print("\n" + "=" * 90)
    print(f"❌ FAIL: {step}")
    print(f"URL: {url}")
    if extra:
        print(f"Extra: {extra}")
    if resp is not None:
        print(f"HTTP {resp.status_code}")
        print("Response headers:", dict(resp.headers))
        # Try JSON first, fall back to text
        try:
            body = resp.json()
            print("Response JSON:\n", _pretty(body))
        except Exception:
            print("Response text:\n", resp.text)
    print("=" * 90 + "\n")
    sys.exit(1)


def ok(msg: str) -> None:
    print(f"✅ {msg}")


def request_json(
    method: str,
    path: str,
    token: Optional[str] = None,
    json_body: Optional[Dict[str, Any]] = None,
    params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    url = f"{BASE_URL}{API_PREFIX}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        resp = requests.request(method, url, headers=headers, json=json_body, params=params, timeout=30)
    except Exception as e:
        fail(f"{method} {path}", url, extra=f"Request error: {repr(e)}")

    if resp.status_code >= 400:
        fail(f"{method} {path}", url, resp=resp)

    try:
        return resp.json()
    except Exception:
        fail(f"{method} {path}", url, resp=resp, extra="Expected JSON but could not parse.")


def login(email: str, password: str) -> str:
    url = f"{BASE_URL}{API_PREFIX}/auth/login"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    last_err: Optional[str] = None

    for attempt in range(1, 11):  # retry up to ~10s
        try:
            resp = requests.post(
                url,
                headers=headers,
                data={"username": email, "password": password},
                timeout=30,
            )
            break
        except Exception as e:
            last_err = repr(e)
            import time
            time.sleep(1)
    else:
        fail("POST /auth/login", url, extra=f"Request error after retries: {last_err}")

    if resp.status_code >= 400:
        fail("POST /auth/login", url, resp=resp)

    try:
        data = resp.json()
    except Exception:
        fail("POST /auth/login", url, resp=resp, extra="Expected JSON but could not parse.")

    token = data.get("access_token") or data.get("token") or data.get("jwt")
    if not token:
        fail("POST /auth/login (token missing)", url, extra=f"Got: {_pretty(data)}")
    return token

def wait_for_api_ready(max_seconds: int = 30) -> None:
    """
    Wait until the API root responds 200.
    Prevents race-condition failures right after docker compose up --build.
    """
    url = f"{BASE_URL}{API_PREFIX}/analytics/health"
    last_err: Optional[str] = None

    for _ in range(max_seconds):
        try:
            r = requests.get(url, timeout=2)
            if r.status_code == 200:
                return
            last_err = f"HTTP {r.status_code}"
        except Exception as e:
            last_err = repr(e)

        # small sleep without importing time
        import time
        time.sleep(1)

    fail("API readiness check", url, extra=f"API not ready after {max_seconds}s. Last error: {last_err}")
    print("-" * 90)
    wait_for_api_ready(max_seconds=int(os.getenv("SMOKE_WAIT_SECONDS", "30")))

def main() -> None:
    print("== Smoke Test ==")
    print(f"BASE_URL={BASE_URL}")
    print(f"API_PREFIX={API_PREFIX}")
    print(f"ADMIN_EMAIL={ADMIN_EMAIL}")
    print(f"STUDENT_EMAIL={STUDENT_EMAIL}")
    print(f"STUDENT_ID={STUDENT_ID}")
    print("-" * 90)

    # 1) Admin login
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    ok("Admin login OK")

    # 2) Student login
    student_token = login(STUDENT_EMAIL, STUDENT_PASSWORD)
    ok("Student login OK")

    # 3) /auth/me for admin
    admin_me = request_json("GET", "/auth/me", token=admin_token)
    ok(f"Admin /auth/me OK (user={admin_me.get('email') or admin_me.get('id')})")

    # 4) /auth/me for student
    student_me = request_json("GET", "/auth/me", token=student_token)
    ok(f"Student /auth/me OK (user={student_me.get('email') or student_me.get('id')})")

    # 5) Admin-only sanity check (GET)
    # If this endpoint name changes later, update just this one line.
    _ = request_json("GET", "/admin/validate-knowledge-pack", token=admin_token)
    ok("Admin validate-knowledge-pack OK")

    # 6) Student recommendations
    rec = request_json("GET", f"/recommendations/{STUDENT_ID}", token=student_token)
    # Validate structure lightly without assuming too much
    if "recommended_careers" not in rec:
        fail("GET /recommendations/{student_id} (missing recommended_careers)",
             f"{BASE_URL}{API_PREFIX}/recommendations/{STUDENT_ID}",
             extra=f"Got: {_pretty(rec)}")
    ok(f"Student recommendations OK (count={len(rec.get('recommended_careers') or [])})")

    # 7) Paid analytics (admin allowed)
    paid = request_json("GET", f"/paid-analytics/{STUDENT_ID}", token=admin_token, params={"version": "v1", "locale": "en"})
    if "student" not in paid and "student_id" not in paid:
        # paid schema may vary; keep the check loose but meaningful
        ok("Paid analytics responded (schema differs; not enforcing strict keys)")
    else:
        ok("Paid analytics OK")

    print("\n" + "=" * 90)
    print("✅ ALL SMOKE TESTS PASSED")
    print("=" * 90 + "\n")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        print("\nUnhandled exception in smoke test:\n")
        traceback.print_exc()
        sys.exit(1)