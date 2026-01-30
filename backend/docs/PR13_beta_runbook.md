# PR13 — Beta Runbook (Reset, Re-ingestion, Support)

## Why this exists (PR13 context)
PR13 makes the platform **beta-operable**: a repeatable, evidence-driven way to
reset safely, re-ingest safely, and troubleshoot consistently.

- No scoring logic changes
- No recommendation logic changes
- No product behaviour changes

This PR is purely **operational enablement**.

---

## 1) Soft reset (runtime only)

### Goal
Clear *student/runtime* data so beta runs can be repeated, while **preserving the knowledge pack**.

### What NOT to delete (must preserve)
- users
- career_clusters, careers, keyskills, skills
- career_keyskill_association
- associated_qualities, aq_facets, question_facet_tags, aq_student_skill_weights
- questions (and other authoring / knowledge-pack tables)

### Delete order (runtime tables only) — schema-proven
Child → parent (derived from FK graph):

1) assessment_responses  
2) assessment_results  
3) student_skill_scores  
4) assessment_questions  
5) context_profile  
6) assessments  
7) student_keyskill_map  
8) student_skill_map  
9) student_analytics_summary  
10) consent_logs  
11) students  

### Scripts
- SQL: `backend/scripts/pr13_reset_soft.sql`  
- Runner: `backend/scripts/pr13_reset_soft.ps1`

### Command to run (Soft reset)
From `backend\`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\pr13_reset_soft.ps1


## 2) Re-ingestion (deterministic, proof-based)

### Purpose
Reload the complete **knowledge pack** in a fixed, auditable order after a soft reset,
using admin ingestion endpoints and capturing proof artifacts for each run.

This process is:
- deterministic (same inputs → same outcome)
- repeatable
- evidence-backed (Snapshot folder)

---

### Canonical DataDir contract
All ingestion CSV files **must** exist under:

backend\data\ingest\


Required files:
- career_clusters.csv
- careers.csv
- keyskills.csv
- career_keyskill_map.csv
- questions.csv
- associated_qualities.csv
- aq_facets.csv
- question_facet_tags_upload.csv
- aq_studentskill_weights.csv

---

### Env vars (admin authentication)
Set once per PowerShell session:

```powershell
$env:CP_BASE_URL="http://127.0.0.1:8000"
$env:CP_ADMIN_EMAIL="aarav.sharma01@testmail.com"
$env:CP_ADMIN_PASSWORD="Test@12345"

Re-ingestion runner

From repo root:

powershell -ExecutionPolicy Bypass -File .\backend\scripts\pr13_reingest.ps1

### Latest validated proof (PASS)

Snapshot:

Snapshot\PR13_reingest_20260130_013050\


Validator output:
- status: `ok`
- gate decision: `pass`
- warning_count: `0`
- generated_at: `2026-01-30T01:30:52.121359`

Core row counts:
- career_clusters: 16
- careers: 376
- keyskills: 1077
- career_keyskill_association: 1780
- associated_qualities: 25
- aq_facets: 123
- questions: 675
- question_facet_tags: 675
- aq_student_skill_weights: 92

Proof artifacts present:
- 01_login.response.json
- 02–10 upload responses (curl JSON)
- 11_validate_knowledge_pack.json
- 12_validate_knowledge_pack.csv

## 3) Support checklist (common failures + exact checks)

### A) Authentication issues (401 / 403)
Checks:
- Admin login works (`/v1/auth/login`)
- Access token returned
- Token passed as `Authorization: Bearer <token>`
- User role = `admin`

---

### B) Ingestion failures (400 / 422 / 500)
Checks:
- CSV headers match endpoint contract exactly
- Files encoded as UTF-8 or UTF-8-BOM (`utf-8-sig`)
- Required CSV exists in `backend\data\ingest\`
- Snapshot upload response exists for the failing step

Logs to inspect:
```powershell
docker compose logs api --tail 200
docker compose logs db --tail 200

Validator warnings

Checks:

Re-run /v1/admin/validate-knowledge-pack

Compare row counts against latest Snapshot proof

Confirm versioned tables (*_v) where applicable
## 4) Beta regression checklist (must pass)

- [ ] Admin login works
- [ ] Soft reset clears runtime tables only
- [ ] Re-ingestion completes with Snapshot proof
- [ ] `/v1/admin/validate-knowledge-pack` returns PASS
- [ ] No warning-level validator issues

### Minimal smoke test
- [ ] Create assessment
- [ ] Fetch questions
- [ ] Submit assessment
- [ ] View results / scorecard
- [ ] Recommendations endpoint works