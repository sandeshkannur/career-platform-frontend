# Creates a minimal CSV that will FAIL sum-to-100 for one career_id (example career_id=1)
$path = Join-Path (Get-Location) "career_keyskill_weights_BAD.csv"

@"
career_id,keyskill_id,weight_percentage
1,1,40
1,2,50
"@ | Out-File -FilePath $path -Encoding utf8

Write-Host "Created: $path"
Write-Host "Career 1 sums to 90 => should fail PR36 enforcement."
