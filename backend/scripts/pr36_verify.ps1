

# ==========================================================
# PR36 Verify Script: API + DB proof for weight-sum enforcement
# Run from: C:\Users\sande\CareerPlatform\backend
# Requires: ADMIN_TOKEN env var OR hardcode login flow
# ==========================================================
$ErrorActionPreference = "Stop"

$BASE = $env:BASE
if (-not $BASE) { $BASE = "http://127.0.0.1:8000" }

if (-not $env:ADMIN_TOKEN) {
  throw "Set ADMIN_TOKEN in your environment first."
}
$token = $env:ADMIN_TOKEN
$headers = @{ Authorization = "Bearer $token" }

Write-Host "=== PR36 VERIFY START ===" -ForegroundColor Cyan

# 1) Validate knowledge pack (should report issue if sums bad)
Write-Host "`n[1/3] GET /v1/admin/validate-knowledge-pack" -ForegroundColor Yellow
$val = Invoke-RestMethod -Method Get -Uri "$BASE/v1/admin/validate-knowledge-pack" -Headers $headers
$val | ConvertTo-Json -Depth 10

# 2) DB proof query (must be empty when correct)
Write-Host "`n[2/3] DB: sums must equal 100 for every career" -ForegroundColor Yellow
docker compose exec db psql -U counseling -d counseling_db -P pager=off -c @"
SELECT career_id, SUM(weight_percentage) AS sum_weight
FROM career_keyskill_association
GROUP BY career_id
HAVING SUM(weight_percentage) <> 100
ORDER BY career_id;
"@

# 3) Optional: if you implement upload endpoint, test failure on bad CSV
Write-Host "`n[3/3] NOTE: After you add POST /v1/admin/upload-career-keyskill-weights," -ForegroundColor Yellow
Write-Host "     test: upload a CSV where one career sums to 90 => expect HTTP 400 with career_id listed." -ForegroundColor Gray

Write-Host "`n=== PR36 VERIFY END ===" -ForegroundColor Cyan
