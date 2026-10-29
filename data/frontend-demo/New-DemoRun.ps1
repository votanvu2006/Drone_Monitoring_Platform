param([Nullable[int]]$Seed = $null)
$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$ComposeFile = Join-Path $ProjectRoot 'data/docker-compose.yml'
$seedSql = if ($null -eq $Seed) { 'NULL' } else { [string]$Seed }
if ($null -ne $Seed -and $Seed -lt 0) { throw 'Seed must be zero or positive.' }
$statement = "CALL start_demo_run($seedSql); CALL verify_frontend_demo();"
$statement | docker compose -f $ComposeFile exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql --user="$MYSQL_USER" --database="$MYSQL_DATABASE"'
if ($LASTEXITCODE -ne 0) { throw 'MySQL did not create a consistent demo run.' }
Push-Location (Join-Path $ProjectRoot 'backend')
try {
  npm run data:export
  if ($LASTEXITCODE -ne 0) { throw 'MySQL changed, but export failed. Fix DB configuration and run npm run data:export again before reviewing the frontend.' }
} finally { Pop-Location }
Write-Host 'Demo run selected and exported. Refresh the frontend after export completes.'
