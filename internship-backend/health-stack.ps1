$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Docker Services ===" -ForegroundColor Cyan
docker compose ps

function Test-Endpoint {
  param(
    [string]$Name,
    [string]$Url
  )

  try {
    $resp = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 8
    Write-Host ("[OK]   {0,-12} {1} ({2})" -f $Name, $Url, $resp.StatusCode) -ForegroundColor Green
  } catch {
    Write-Host ("[FAIL] {0,-12} {1}" -f $Name, $Url) -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "=== HTTP Health ===" -ForegroundColor Cyan
Test-Endpoint -Name "API" -Url "http://localhost:3001/health"
Test-Endpoint -Name "Hasura" -Url "http://localhost:8080/healthz"
Test-Endpoint -Name "Temporal UI" -Url "http://localhost:8233"

Write-Host ""
