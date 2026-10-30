$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker was not found. Install Docker Desktop for Windows, start it, then run this script again." -ForegroundColor Red
  exit 1
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker Desktop is installed but its engine is not running. Open Docker Desktop and wait until it says Engine running." -ForegroundColor Yellow
  exit 1
}
docker compose -f docker-compose.local.yml up -d
if ($LASTEXITCODE -ne 0) { throw "MediaMTX failed to start. Check Docker Desktop and the compose logs." }
Write-Host ""
Write-Host "MediaMTX is running." -ForegroundColor Green
Write-Host "In Web Stream, use: http://localhost:8889/live/whip"
Write-Host "Check status: docker compose -f docker-compose.local.yml logs -f"
Write-Host "When finished, run windows\stop-gateway.ps1"
