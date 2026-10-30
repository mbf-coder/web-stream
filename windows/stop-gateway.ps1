$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if (Get-Command docker -ErrorAction SilentlyContinue) {
  docker compose -f docker-compose.local.yml down
  if ($LASTEXITCODE -ne 0) { throw "Could not stop MediaMTX cleanly." }
  Write-Host "Local MediaMTX gateway stopped." -ForegroundColor Green
} else {
  Write-Host "Docker command not found; MediaMTX may already be stopped." -ForegroundColor Yellow
}
