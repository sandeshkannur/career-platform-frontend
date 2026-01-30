# PR13 Soft Reset runner
# Runs the runtime-only reset SQL inside docker and prints proof counts.
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\scripts\pr13_reset_soft.ps1

$U = "counseling"
$D = "counseling_db"
$SQL_LOCAL = ".\scripts\pr13_reset_soft.sql"  # host path (Windows)

Write-Host "=== PR13 Soft Reset (runtime-only) ==="
Write-Host "DB: $D  User: $U"
Write-Host ""

Write-Host ">>> BEFORE counts (runtime + knowledge spot-check)"
docker compose exec db psql -U $U -d $D -P pager=off -c "SELECT 'assessments' AS t, COUNT(*) FROM assessments;"
docker compose exec db psql -U $U -d $D -P pager=off -c "SELECT 'students' AS t, COUNT(*) FROM students;"
docker compose exec db psql -U $U -d $D -P pager=off -c "SELECT 'careers' AS t, COUNT(*) FROM careers;"
docker compose exec db psql -U $U -d $D -P pager=off -c "SELECT 'questions' AS t, COUNT(*) FROM questions;"
Write-Host ""

Write-Host ">>> Running reset SQL from host file: $SQL_LOCAL"
Get-Content $SQL_LOCAL -Raw | docker compose exec -T db psql -U $U -d $D -P pager=off

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Reset failed. If the error mentions a missing table (e.g., consent_logs/context_profile), remove that DELETE line from the SQL and re-run."
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host ">>> AFTER counts (should be 0 for runtime tables; knowledge pack should remain)"
docker compose exec db psql -U $U -d $D -P pager=off -c "SELECT 'assessments' AS t, COUNT(*) FROM assessments;"
docker compose exec db psql -U $U -d $D -P pager=off -c "SELECT 'assessment_responses' AS t, COUNT(*) FROM assessment_responses;"
docker compose exec db psql -U $U -d $D -P pager=off -c "SELECT 'students' AS t, COUNT(*) FROM students;"
docker compose exec db psql -U $U -d $D -P pager=off -c "SELECT 'careers' AS t, COUNT(*) FROM careers;"
docker compose exec db psql -U $U -d $D -P pager=off -c "SELECT 'questions' AS t, COUNT(*) FROM questions;"

Write-Host ""
Write-Host "=== Done ==="
