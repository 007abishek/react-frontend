param(
  [string]$HasuraUrl = "http://localhost:8080",
  [string]$AdminSecret = "hasura_admin_secret_123",
  [string]$MetadataPath = ".\hasura-metadata.json",
  [string]$SeedPath = ".\hasura\seeds\default\products_seed.sql",
  [int]$HealthRetries = 30,
  [int]$HealthRetryDelaySec = 3
)

$ErrorActionPreference = "Stop"

function Invoke-HasuraMetadata {
  param([string]$Body)
  $utf8Body = [System.Text.Encoding]::UTF8.GetBytes($Body)
  Invoke-RestMethod `
    -Uri "$HasuraUrl/v1/metadata" `
    -Method POST `
    -Headers @{
      "x-hasura-admin-secret" = $AdminSecret
      "Content-Type"          = "application/json; charset=utf-8"
    } `
    -Body $utf8Body
}

function Invoke-HasuraGraphQL {
  param([string]$Body)
  $utf8Body = [System.Text.Encoding]::UTF8.GetBytes($Body)
  Invoke-RestMethod `
    -Uri "$HasuraUrl/v1/graphql" `
    -Method POST `
    -Headers @{
      "x-hasura-admin-secret" = $AdminSecret
      "Content-Type"          = "application/json; charset=utf-8"
    } `
    -Body $utf8Body
}

function Invoke-HasuraV2Query {
  param([string]$Body)
  $utf8Body = [System.Text.Encoding]::UTF8.GetBytes($Body)
  Invoke-RestMethod `
    -Uri "$HasuraUrl/v2/query" `
    -Method POST `
    -Headers @{
      "x-hasura-admin-secret" = $AdminSecret
      "Content-Type"          = "application/json; charset=utf-8"
    } `
    -Body $utf8Body
}

Write-Host "Checking Hasura health..."
$health = $null
for ($attempt = 1; $attempt -le $HealthRetries; $attempt++) {
  try {
    $health = Invoke-WebRequest -UseBasicParsing -Uri "$HasuraUrl/healthz" -TimeoutSec 5
    if ($health.StatusCode -eq 200) {
      break
    }
    Write-Host "Hasura health attempt $attempt/$HealthRetries returned status $($health.StatusCode). Retrying in $HealthRetryDelaySec sec..."
  } catch {
    $msg = $_.Exception.Message
    Write-Host "Hasura health attempt $attempt/$HealthRetries failed: $msg"
  }

  if ($attempt -lt $HealthRetries) {
    Start-Sleep -Seconds $HealthRetryDelaySec
  }
}

if (-not $health -or $health.StatusCode -ne 200) {
  throw "Hasura health check failed after $HealthRetries attempts. Check 'docker compose logs hasura' for root cause."
}
Write-Host "Hasura is healthy."

if (-not (Test-Path $MetadataPath)) {
  throw "Metadata file not found at $MetadataPath"
}

Write-Host "Applying metadata from $MetadataPath ..."
$body = Get-Content -Raw $MetadataPath
$result = Invoke-HasuraMetadata -Body $body
if ($result.message -ne "success") {
  throw "Metadata apply failed: $($result | ConvertTo-Json -Depth 20)"
}
Write-Host "Metadata apply succeeded."

if (Test-Path $SeedPath) {
  Write-Host "Applying seed SQL from $SeedPath ..."
  $seedSql = Get-Content -Raw $SeedPath
  # Avoid ConvertTo-Json OOM/StackOverflow issues with large multiline SQL payloads.
  $escapedSql = $seedSql.Replace("\", "\\").Replace('"', '\"').Replace("`r", "").Replace("`n", "\n")

  $seedBody = '{"type":"run_sql","args":{"source":"default","sql":"' +
    $escapedSql +
    '","cascade":false,"read_only":false}}'

  $seedResult = Invoke-HasuraV2Query -Body $seedBody
  if ($seedResult.result_type -ne "CommandOk") {
    throw "Seed apply failed: $($seedResult | ConvertTo-Json -Depth 20)"
  }
  Write-Host "Seed apply succeeded."
} else {
  Write-Host "Seed file not found at $SeedPath. Skipping seed apply."
}

Write-Host "Running GraphQL schema sanity check..."
$schemaBody = '{"query":"query { __schema { queryType { fields { name } } } }"}'
$schema = Invoke-HasuraGraphQL -Body $schemaBody
$fieldNames = @($schema.data.__schema.queryType.fields | ForEach-Object { $_.name })

foreach ($required in @("products", "cart_items", "orders")) {
  if ($fieldNames -notcontains $required) {
    throw "Missing required query field '$required'."
  }
}

Write-Host "Schema check passed."
Write-Host "Done."
