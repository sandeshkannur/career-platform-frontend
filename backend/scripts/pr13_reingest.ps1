# PR13 Re-ingestion Wrapper
# Calls admin upload endpoints in the correct order and saves proof outputs.
#
# Recommended usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File .\backend\scripts\pr13_reingest.ps1
#
# Auth should be provided via env vars (preferred, no secrets in code):
#   $env:CP_BASE_URL="http://127.0.0.1:8000"
#   $env:CP_ADMIN_EMAIL="aarav.sharma01@testmail.com"
#   $env:CP_ADMIN_PASSWORD="Test@12345"
#
# Optional overrides as params still supported:
#   powershell -ExecutionPolicy Bypass -File .\scripts\pr13_reingest.ps1 `
#     -BaseUrl "http://127.0.0.1:8000" `
#     -AdminEmail "..." `
#     -AdminPassword "..." `
#     -DataDir ".\data\ingest"

param(
  [string]$BaseUrl,
  [string]$AdminEmail,
  [string]$AdminPassword,
  [string]$DataDir
)

$ErrorActionPreference = "Stop"

# -----------------------------
# Resolve config (env vars first)
# -----------------------------
if (-not $BaseUrl)       { $BaseUrl       = $env:CP_BASE_URL }
if (-not $AdminEmail)    { $AdminEmail    = $env:CP_ADMIN_EMAIL }
if (-not $AdminPassword) { $AdminPassword = $env:CP_ADMIN_PASSWORD }

# Default DataDir contract:
# If run from backend\ => .\data\ingest
# If run from repo root => .\backend\data\ingest (we normalize below)
if (-not $DataDir) {
  # Try to infer whether we're in backend\ or repo root
  if (Test-Path ".\data\ingest") { $DataDir = ".\data\ingest" }
  elseif (Test-Path ".\backend\data\ingest") { $DataDir = ".\backend\data\ingest" }
  else { $DataDir = ".\data\ingest" }
}

if (-not $AdminEmail -or -not $AdminPassword) {
  throw "CP_ADMIN_EMAIL and CP_ADMIN_PASSWORD must be set (env vars) OR passed as -AdminEmail/-AdminPassword."
}

# Normalize BaseUrl (avoid trailing slash issues)
$BaseUrl = $BaseUrl.TrimEnd("/")

# Normalize DataDir to absolute path
try {
  $DataDir = (Resolve-Path $DataDir).Path
} catch {
  throw "DataDir not found: $DataDir (expected backend\data\ingest)."
}

# -----------------------------
# Snapshot proof folder
# -----------------------------
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Create Snapshot under repo root if possible; fallback to current folder
$RepoRoot = $null
if (Test-Path ".\Snapshot") { $RepoRoot = (Resolve-Path ".").Path }
elseif (Test-Path ".\backend\Snapshot") { $RepoRoot = (Resolve-Path ".\backend").Path }
else { $RepoRoot = (Resolve-Path ".").Path }

$OutDir = Join-Path $RepoRoot ("Snapshot\PR13_reingest_{0}" -f $Stamp)
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function SaveText($path, $content) {
  $content | Out-File -FilePath $path -Encoding utf8
}

function SaveJson($path, $obj) {
  SaveText $path ($obj | ConvertTo-Json -Depth 50)
}

function AssertFile($csvPath) {
  if (-not (Test-Path $csvPath)) {
    throw "Missing CSV file: $csvPath"
  }
}

# -----------------------------
# Upload helper (Invoke-RestMethod first, curl.exe fallback)
# -----------------------------
function UploadCsv {
  param(
    [string]$endpoint,
    [string]$csvPath,
    [string]$token,
    [string]$outPrefix,
    [hashtable]$extraFields = $null
  )

  AssertFile $csvPath

  $uri = "$BaseUrl$endpoint"
  Write-Host ">>> Upload: $endpoint"

  # -----------------------------
  # Primary path: curl.exe (reliable on Windows)
  # -----------------------------
  try {
    $outFile = Join-Path $OutDir "$outPrefix.curl.response.json"

    $args = @(
      "-sS",
      "-X", "POST",
      "-H", "Authorization: Bearer $token",
      "-H", "accept: application/json",
      "-F", ("file=@{0};type=text/csv" -f $csvPath)
    )

    if ($extraFields) {
      foreach ($k in $extraFields.Keys) {
        $args += @("-F", ("{0}={1}" -f $k, $extraFields[$k]))
      }
    }

    $args += $uri

    $raw = & curl.exe @args 2>&1
    $raw | Out-File -FilePath $outFile -Encoding utf8

    if (-not $raw) {
      throw "curl returned empty response"
    }

    Write-Host "OK -> saved $outPrefix.curl.response.json"
    return
  }
  catch {
    Write-Host "WARN: curl upload failed, attempting PowerShell fallback..."
  }

  # -----------------------------
  # Fallback path: Invoke-RestMethod
  # -----------------------------
  try {
    $headers = @{ Authorization = "Bearer $token" }
    $form = @{ file = Get-Item $csvPath }

    if ($extraFields) {
      foreach ($k in $extraFields.Keys) {
        $form[$k] = $extraFields[$k]
      }
    }

    $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Form $form
    SaveJson (Join-Path $OutDir "$outPrefix.response.json") $resp
    Write-Host "OK (fallback) -> saved $outPrefix.response.json"
    return
  }
  catch {
    SaveText (Join-Path $OutDir "$outPrefix.ERROR.txt") $_.Exception.Message
    throw "Upload failed for $endpoint"
  }
}

# -----------------------------
# Start
# -----------------------------
Write-Host "=== PR13 Re-ingestion ==="
Write-Host "BaseUrl:  $BaseUrl"
Write-Host "DataDir:  $DataDir"
Write-Host "OutDir :  $OutDir"
Write-Host ""

# 0) Preflight: fetch openapi.json and ensure endpoints exist (fail fast with clarity)
$openapi = $null
try {
  $openapi = Invoke-RestMethod -Method Get -Uri "$BaseUrl/openapi.json"
  SaveJson (Join-Path $OutDir "00_openapi.json") $openapi
} catch {
  SaveText (Join-Path $OutDir "00_openapi.ERROR.txt") $_.Exception.Message
  throw "Cannot fetch openapi.json from $BaseUrl (is API running?)."
}

$paths = @()
try { $paths = $openapi.paths.PSObject.Properties.Name } catch { $paths = @() }

# Note: you previously observed duplicated /v1/admin/v1/admin/... path in Swagger.
if ($paths -contains "/v1/admin/v1/admin/upload-aq-studentskill-weights") {
  Write-Host "WARN: OpenAPI contains duplicated path: /v1/admin/v1/admin/upload-aq-studentskill-weights"
  Write-Host "      Script will use: /v1/admin/upload-aq-studentskill-weights"
}

# 1) Login (admin)
Write-Host ">>> Admin login"
$loginBody = @{
  email    = $AdminEmail
  password = $AdminPassword
} | ConvertTo-Json

$login = $null
try {
  $login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/v1/auth/login" `
    -ContentType "application/json" `
    -Body $loginBody
  SaveJson (Join-Path $OutDir "01_login.response.json") $login
} catch {
  $errMsg = $_.Exception.Message
  SaveText (Join-Path $OutDir "01_login.ERROR.txt") $errMsg

  try {
    $resp = $_.Exception.Response
    if ($resp -and $resp.GetResponseStream()) {
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $detail = $reader.ReadToEnd()
      SaveText (Join-Path $OutDir "01_login.ERROR.detail.json") $detail
    }
  } catch {}

  throw "Admin login failed. See Snapshot proof files in $OutDir."
}

$token = $login.access_token
if (-not $token) { throw "Login succeeded but access_token missing. Check 01_login.response.json" }

Write-Host "OK -> token received, saved 01_login.response.json"
Write-Host ""

# -----------------------------
# Upload sequence (knowledge pack)
# IMPORTANT: Only adjust endpoint strings + filenames if your repo differs.
# -----------------------------
Write-Host ">>> Upload sequence (knowledge pack)"

# Define uploads (endpoint + filename + optional extra form fields)
$uploads = @(
  @{ endpoint="/v1/admin/upload-career-clusters";          file="career_clusters.csv";           out="02_upload_career_clusters"; extra=$null },
  @{ endpoint="/v1/admin/upload-careers";                  file="careers.csv";                   out="03_upload_careers";         extra=$null },
  @{ endpoint="/v1/admin/upload-keyskills";                file="keyskills.csv";                 out="04_upload_keyskills";       extra=$null },

  # If your endpoint is named differently (e.g., upload-career-keyskills), change ONLY the endpoint string here.
  @{ endpoint="/v1/admin/upload-career-keyskill-map";      file="career_keyskill_map.csv";       out="05_upload_career_keyskill_map"; extra=$null },

  # Questions often require assessment_version. Extra fields are safe even if ignored by the endpoint.
  @{ endpoint="/v1/admin/upload-questions";                file="questions.csv";                 out="06_upload_questions";        extra=@{ assessment_version="v1" } },

  # Associated Qualities + facets + weights
  @{ endpoint="/v1/admin/upload-aqs";                      file="associated_qualities.csv";      out="07_upload_aqs";              extra=$null },
  @{ endpoint="/v1/admin/upload-aq-facets";                file="aq_facets.csv";                 out="08_upload_aq_facets";         extra=$null },

  # IMPORTANT: Use the *operational* PR12/PR13 facet-tags upload CSV (your compliant one)
  @{ endpoint="/v1/admin/upload-question-facet-tags";      file="question_facet_tags_upload.csv"; out="09_upload_question_facet_tags"; extra=$null },

  @{ endpoint="/v1/admin/upload-aq-studentskill-weights";  file="aq_studentskill_weights.csv";   out="10_upload_aq_studentskill_weights"; extra=$null }
)

# Preflight: endpoint presence check (warn-only, do not block if OpenAPI is odd)
foreach ($u in $uploads) {
  if ($paths.Count -gt 0 -and -not ($paths -contains $u.endpoint)) {
    Write-Host "WARN: OpenAPI does not list endpoint: $($u.endpoint)"
    Write-Host "      (This may be Swagger/path duplication. Will try anyway.)"
  }
}

# Execute uploads
foreach ($u in $uploads) {
  $csvPath = Join-Path $DataDir $u.file
  UploadCsv -endpoint $u.endpoint -csvPath $csvPath -token $token -outPrefix $u.out -extraFields $u.extra
}

Write-Host ""
Write-Host ">>> Validate knowledge pack"
$headers = @{ Authorization = "Bearer $token" }

try {
  $val = Invoke-RestMethod -Method Get -Uri "$BaseUrl/v1/admin/validate-knowledge-pack" -Headers $headers
  SaveJson (Join-Path $OutDir "11_validate_knowledge_pack.json") $val
  Write-Host "OK -> saved 11_validate_knowledge_pack.json"
} catch {
  SaveText (Join-Path $OutDir "11_validate_knowledge_pack.ERROR.txt") $_.Exception.Message
  throw "validate-knowledge-pack failed. See proof files in $OutDir."
}

# Save CSV proof (optional)
try {
  Invoke-WebRequest -Method Get -Uri "$BaseUrl/v1/admin/validate-knowledge-pack.csv" -Headers $headers -OutFile (Join-Path $OutDir "12_validate_knowledge_pack.csv")
  Write-Host "OK -> saved 12_validate_knowledge_pack.csv"
} catch {
  SaveText (Join-Path $OutDir "12_validate_knowledge_pack_csv.ERROR.txt") $_.Exception.Message
  Write-Host "WARN: Could not download validate-knowledge-pack.csv (endpoint may not be enabled)."
}

Write-Host ""
Write-Host "=== Done ==="
Write-Host "Proof folder: $OutDir"
