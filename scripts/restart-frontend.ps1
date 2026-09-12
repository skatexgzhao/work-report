# Restart frontend only (background, no extra windows)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$FrontendDir = Join-Path $Root "frontend"
$DevDir = Join-Path $Root ".dev"

function Stop-Port([int]$port) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

$viteBin = Join-Path $FrontendDir "node_modules\.bin\vite.cmd"
if (-not (Test-Path $viteBin)) {
  Write-Host "Installing frontend dependencies ..." -ForegroundColor Yellow
  Push-Location $FrontendDir
  npm install
  Pop-Location
}

Stop-Port 5173
Start-Sleep -Seconds 1

New-Item -ItemType Directory -Force -Path $DevDir | Out-Null
$npmCmd = if (Test-Path "$env:ProgramFiles\nodejs\npm.cmd") { "$env:ProgramFiles\nodejs\npm.cmd" } else { "npm.cmd" }
Start-Process -FilePath $npmCmd -ArgumentList @("run","dev") -WorkingDirectory $FrontendDir `
  -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $DevDir "frontend.out.log") `
  -RedirectStandardError (Join-Path $DevDir "frontend.err.log") | Out-Null

Write-Host "Frontend running in background: http://localhost:5173/login" -ForegroundColor Green
Write-Host "Logs: .dev\frontend.out.log" -ForegroundColor DarkGray
