# ==========================================================
# PR36 End-to-End Verification (PowerShell 5.1 compatible)
# Uses curl.exe for multipart uploads (since -Form isn't supported)
# ==========================================================

$ErrorActionPreference = "Stop"

# ---- CONFIG ----
$BASE = "http://127.0.0.1:8000"
$ADMIN_EMAIL = "aarav.sharma01@testmail.com"
$ADMIN_PASSWORD = "Test@12345"

$BAD_CSV = Join-Path (Get-Location) "career_keyskill_weights_BAD.csv"
$FIX_CSV = Join-Path (Get-Location) "career_keyskill_weights_FIX.csv"

Write-Host "=== PR36 END-TO-END VERIFY START ===" -ForegroundColor Cyan

if (-not (Test-Path $BAD_CSV)) { throw "Missing file: $BAD_CSV" }
if (-not (Test-Path $FIX_CSV)) { throw "Missing file: $FIX_CSV" }

# ---- 1) Login -> ADMIN_TOKEN ----
Write-Host "`n[1/6] Login as Admin and set ADMIN_TOKEN" -ForegroundColor Yellow

$loginBody = @{
  email    = $ADMIN_EMAIL
  password = $ADMIN_PASSWORD
} | ConvertTo-Json

$loginResp = Invoke-RestMethod -Method Post -Uri "$BASE/v1/auth/login" -ContentType "application/json" -Body $loginBody
if (-not $loginResp.access_token) { throw "Login response did not include access_token" }

$env:ADMIN_TOKEN = $loginResp.access_token
Write-Host ("ADMIN_TOKEN set. First 20 chars: " + $env:ADMIN_TOKEN.Substring(0,20)) -ForegroundColor Green

# Helper: curl upload (multipart)
function Invoke-CurlUpload {
  param(
    [Parameter(Mandatory=$true)][string]$Uri,
    [Parameter(Mandatory=$true)][string]$CsvPath
  )
  $token = $env:ADMIN_TOKEN
  if (-not $token) { throw "ADMIN_TOKEN missing" }

  # curl.exe returns body to stdout; HTTP code via -w
  $cmd = @(
    "curl.exe",
    "-sS",
    "-X", "POST",
    "-H", "Authorization: Bearer $token",
    "-F", "file=@$CsvPath",
    "-w", "HTTPSTATUS:%{http_code}",
    $Uri
  )

  $out = & $cmd[0] $cmd[1..($cmd.Count-1)]
  if (-not $out) { throw "No output from curl.exe" }

  $parts = $out -split "HTTPSTATUS:"
  $body = $parts[0].Trim()
  $status = [int]$parts[1].Trim()

  return @{ status = $status; body = $body }
}

# ---- 2) Upload BAD CSV -> expect 400 ----
Write-Host "`n[2/6] Upload BAD CSV -> expect HTTP 400 with bad_careers" -ForegroundColor Yellow
$bad = Invoke-CurlUpload -Uri "$BASE/v1/admin/upload-career-keyskill-weights?dry_run=true" -CsvPath $BAD_CSV
Write-Host ("HTTP Status: " + $bad.status) -ForegroundColor Gray
Write-Host $bad.body

if ($bad.status -ne 400) { throw "Expected HTTP 400 for BAD CSV, got $($bad.status)" }

# ---- 3) Upload FIX CSV dry-run -> expect 200 ----
Write-Host "`n[3/6] Upload FIX CSV with dry_run=true -> expect HTTP 200" -ForegroundColor Yellow
$fixDry = Invoke-CurlUpload -Uri "$BASE/v1/admin/upload-career-keyskill-weights?dry_run=true" -CsvPath $FIX_CSV
Write-Host ("HTTP Status: " + $fixDry.status) -ForegroundColor Gray
Write-Host $fixDry.body

if ($fixDry.status -ne 200) { throw "Expected HTTP 200 for FIX CSV dry_run, got $($fixDry.status)" }

# ---- 4) Upload FIX CSV real -> expect 200 ----
Write-Host "`n[4/6] Upload FIX CSV with dry_run=false -> expect HTTP 200" -ForegroundColor Yellow
$fixReal = Invoke-CurlUpload -Uri "$BASE/v1/admin/upload-career-keyskill-weights?dry_run=false" -CsvPath $FIX_CSV
Write-Host ("HTTP Status: " + $fixReal.status) -ForegroundColor Gray
Write-Host $fixReal.body

if ($fixReal.status -ne 200) { throw "Expected HTTP 200 for FIX CSV real upload, got $($fixReal.status)" }

# ---- 5) psql check: 0 rows where sum != 100 ----
Write-Host "`n[5/6] DB check: SUM(weight_percentage) <> 100 should return 0 rows" -ForegroundColor Yellow
docker compose exec db psql -U counseling -d counseling_db -P pager=off -c `
"SELECT career_id, SUM(weight_percentage) AS sum_weight FROM career_keyskill_association GROUP BY career_id HAVING SUM(weight_percentage) <> 100 ORDER BY career_id;"

# ---- 6) Admin validation ----
Write-Host "`n[6/6] GET /v1/admin/validate-knowledge-pack -> expect pass, 0 errors, 0 warnings" -ForegroundColor Yellow
$headers=@{ Authorization="Bearer $env:ADMIN_TOKEN" }
$val = Invoke-RestMethod -Method Get -Uri "$BASE/v1/admin/validate-knowledge-pack" -Headers $headers
$val | ConvertTo-Json -Depth 20

$gate = $val.issues | Where-Object { $_.code -eq "gate.decision" } | Select-Object -First 1
if (-not $gate) { throw "gate.decision issue not found in response" }
if ($gate.sample.decision -ne "pass") { throw "Expected pass, got $($gate.sample.decision)" }
if ($gate.sample.error_count -ne 0) { throw "Expected error_count 0, got $($gate.sample.error_count)" }
if ($gate.sample.warning_count -ne 0) { throw "Expected warning_count 0, got $($gate.sample.warning_count)" }

Write-Host "`n=== PR36 END-TO-END VERIFY PASS ✅ ===" -ForegroundColor Green
# ==========================================================
# PR36 End-to-End Verification (PowerShell 5.1 compatible)
# Uses curl.exe for multipart uploads (since -Form isn't supported)
# ==========================================================

$ErrorActionPreference = "Stop"

# ---- CONFIG ----
$BASE = "http://127.0.0.1:8000"
$ADMIN_EMAIL = "aarav.sharma01@testmail.com"
$ADMIN_PASSWORD = "Test@12345"

$BAD_CSV = Join-Path (Get-Location) "career_keyskill_weights_BAD.csv"
$FIX_CSV = Join-Path (Get-Location) "career_keyskill_weights_FIX.csv"

Write-Host "=== PR36 END-TO-END VERIFY START ===" -ForegroundColor Cyan

if (-not (Test-Path $BAD_CSV)) { throw "Missing file: $BAD_CSV" }
if (-not (Test-Path $FIX_CSV)) { throw "Missing file: $FIX_CSV" }

# ---- 1) Login -> ADMIN_TOKEN ----
Write-Host "`n[1/6] Login as Admin and set ADMIN_TOKEN" -ForegroundColor Yellow

$loginBody = @{
  email    = $ADMIN_EMAIL
  password = $ADMIN_PASSWORD
} | ConvertTo-Json

$loginResp = Invoke-RestMethod -Method Post -Uri "$BASE/v1/auth/login" -ContentType "application/json" -Body $loginBody
if (-not $loginResp.access_token) { throw "Login response did not include access_token" }

$env:ADMIN_TOKEN = $loginResp.access_token
Write-Host ("ADMIN_TOKEN set. First 20 chars: " + $env:ADMIN_TOKEN.Substring(0,20)) -ForegroundColor Green

# Helper: curl upload (multipart)
function Invoke-CurlUpload {
  param(
    [Parameter(Mandatory=$true)][string]$Uri,
    [Parameter(Mandatory=$true)][string]$CsvPath
  )
  $token = $env:ADMIN_TOKEN
  if (-not $token) { throw "ADMIN_TOKEN missing" }

  # curl.exe returns body to stdout; HTTP code via -w
  $cmd = @(
    "curl.exe",
    "-sS",
    "-X", "POST",
    "-H", "Authorization: Bearer $token",
    "-F", "file=@$CsvPath",
    "-w", "HTTPSTATUS:%{http_code}",
    $Uri
  )

  $out = & $cmd[0] $cmd[1..($cmd.Count-1)]
  if (-not $out) { throw "No output from curl.exe" }

  $parts = $out -split "HTTPSTATUS:"
  $body = $parts[0].Trim()
  $status = [int]$parts[1].Trim()

  return @{ status = $status; body = $body }
}

# ---- 2) Upload BAD CSV -> expect 400 ----
Write-Host "`n[2/6] Upload BAD CSV -> expect HTTP 400 with bad_careers" -ForegroundColor Yellow
$bad = Invoke-CurlUpload -Uri "$BASE/v1/admin/upload-career-keyskill-weights?dry_run=true" -CsvPath $BAD_CSV
Write-Host ("HTTP Status: " + $bad.status) -ForegroundColor Gray
Write-Host $bad.body

if ($bad.status -ne 400) { throw "Expected HTTP 400 for BAD CSV, got $($bad.status)" }

# ---- 3) Upload FIX CSV dry-run -> expect 200 ----
Write-Host "`n[3/6] Upload FIX CSV with dry_run=true -> expect HTTP 200" -ForegroundColor Yellow
$fixDry = Invoke-CurlUpload -Uri "$BASE/v1/admin/upload-career-keyskill-weights?dry_run=true" -CsvPath $FIX_CSV
Write-Host ("HTTP Status: " + $fixDry.status) -ForegroundColor Gray
Write-Host $fixDry.body

if ($fixDry.status -ne 200) { throw "Expected HTTP 200 for FIX CSV dry_run, got $($fixDry.status)" }

# ---- 4) Upload FIX CSV real -> expect 200 ----
Write-Host "`n[4/6] Upload FIX CSV with dry_run=false -> expect HTTP 200" -ForegroundColor Yellow
$fixReal = Invoke-CurlUpload -Uri "$BASE/v1/admin/upload-career-keyskill-weights?dry_run=false" -CsvPath $FIX_CSV
Write-Host ("HTTP Status: " + $fixReal.status) -ForegroundColor Gray
Write-Host $fixReal.body

if ($fixReal.status -ne 200) { throw "Expected HTTP 200 for FIX CSV real upload, got $($fixReal.status)" }

# ---- 5) psql check: 0 rows where sum != 100 ----
Write-Host "`n[5/6] DB check: SUM(weight_percentage) <> 100 should return 0 rows" -ForegroundColor Yellow
docker compose exec db psql -U counseling -d counseling_db -P pager=off -c `
"SELECT career_id, SUM(weight_percentage) AS sum_weight FROM career_keyskill_association GROUP BY career_id HAVING SUM(weight_percentage) <> 100 ORDER BY career_id;"

# ---- 6) Admin validation ----
Write-Host "`n[6/6] GET /v1/admin/validate-knowledge-pack -> expect pass, 0 errors, 0 warnings" -ForegroundColor Yellow
$headers=@{ Authorization="Bearer $env:ADMIN_TOKEN" }
$val = Invoke-RestMethod -Method Get -Uri "$BASE/v1/admin/validate-knowledge-pack" -Headers $headers
$val | ConvertTo-Json -Depth 20

$gate = $val.issues | Where-Object { $_.code -eq "gate.decision" } | Select-Object -First 1
if (-not $gate) { throw "gate.decision issue not found in response" }
if ($gate.sample.decision -ne "pass") { throw "Expected pass, got $($gate.sample.decision)" }
if ($gate.sample.error_count -ne 0) { throw "Expected error_count 0, got $($gate.sample.error_count)" }
if ($gate.sample.warning_count -ne 0) { throw "Expected warning_count 0, got $($gate.sample.warning_count)" }

Write-Host "`n=== PR36 END-TO-END VERIFY PASS ===" -ForegroundColor Green
