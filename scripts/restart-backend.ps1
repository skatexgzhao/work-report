# Restart backend only (background, no extra windows)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$BackendDir = Join-Path $Root "backend"
$DevDir = Join-Path $Root ".dev"

function Stop-Port([int]$port) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

if (-not (Test-Path (Join-Path $BackendDir ".env"))) {
  Copy-Item (Join-Path $BackendDir ".env.example") (Join-Path $BackendDir ".env") -ErrorAction SilentlyContinue
}

Stop-Port 3000
Start-Sleep -Seconds 1

New-Item -ItemType Directory -Force -Path $DevDir | Out-Null
$npmCmd = if (Test-Path "$env:ProgramFiles\nodejs\npm.cmd") { "$env:ProgramFiles\nodejs\npm.cmd" } else { "npm.cmd" }
Start-Process -FilePath $npmCmd -ArgumentList @("run","dev") -WorkingDirectory $BackendDir `
  -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $DevDir "backend.out.log") `
  -RedirectStandardError (Join-Path $DevDir "backend.err.log") | Out-Null

Write-Host "Backend running in background: http://localhost:3000/api/v1/health" -ForegroundColor Green
Write-Host "Logs: .dev\backend.out.log" -ForegroundColor DarkGray
