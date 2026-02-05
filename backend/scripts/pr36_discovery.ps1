# ==========================================================
# PR36 Discovery Script: Career->KeySkill weight sum validation
# Run from: C:\Users\sande\CareerPlatform\backend
# ==========================================================
$ErrorActionPreference = "Stop"

Write-Host "=== PR36 DISCOVERY START ===" -ForegroundColor Cyan

# 1) Confirm migration column exists
Write-Host "`n[1/5] DB: Confirm weight_percentage exists" -ForegroundColor Yellow
docker compose exec db psql -U counseling -d counseling_db -P pager=off -c "\d career_keyskill_association"

# 2) DB: show careers where sum != 100
Write-Host "`n[2/5] DB: Career sums != 100" -ForegroundColor Yellow
docker compose exec db psql -U counseling -d counseling_db -P pager=off -c @"
SELECT career_id, SUM(weight_percentage) AS sum_weight
FROM career_keyskill_association
GROUP BY career_id
HAVING SUM(weight_percentage) <> 100
ORDER BY career_id
LIMIT 50;
"@

# 3) Code: locate validator rule
Write-Host "`n[3/5] CODE: Find validator issue code" -ForegroundColor Yellow
Select-String -Path ".\app\services\knowledge_pack_validation.py" -Pattern "career_keyskill_weights.sum_not_100" -SimpleMatch

# 4) API: ensure validate-knowledge-pack endpoint exists in router
Write-Host "`n[4/5] CODE: Find validate-knowledge-pack routes" -ForegroundColor Yellow
Select-String -Path ".\app\routers\admin.py" -Pattern "validate-knowledge-pack" -SimpleMatch

# 5) API: check if upload-career-keyskill-weights endpoint exists already
Write-Host "`n[5/5] CODE: Search for upload-career-keyskill-weights endpoint" -ForegroundColor Yellow
$hit = Select-String -Path ".\app\routers\admin.py" -Pattern "upload-career-keyskill-weights" -SimpleMatch -ErrorAction SilentlyContinue
if ($hit) {
  Write-Host "FOUND: upload-career-keyskill-weights route exists." -ForegroundColor Green
} else {
  Write-Host "MISSING: upload-career-keyskill-weights route not found (likely needs implementation in PR36)." -ForegroundColor Red
}

Write-Host "`n=== PR36 DISCOVERY END ===" -ForegroundColor Cyan
