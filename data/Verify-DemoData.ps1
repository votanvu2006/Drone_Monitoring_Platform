$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ComposeFile = Join-Path $ProjectRoot 'data/docker-compose.yml'

Get-Content -Raw (Join-Path $PSScriptRoot 'verify.sql') |
  docker compose -f $ComposeFile exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql --user="$MYSQL_USER" --database="$MYSQL_DATABASE"'

if ($LASTEXITCODE -ne 0) {
  throw 'MySQL verification failed.'
}

node (Join-Path $PSScriptRoot 'tools/check-snapshot.mjs')

if ($LASTEXITCODE -ne 0) {
  throw 'Frontend snapshot verification failed.'
}
