# Team Report V1 - dev restart (background, no extra windows)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/restart-dev.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$DevDir = Join-Path $Root ".dev"
$BackendPort = 3000
$FrontendPort = 5173

function Write-Step([string]$msg) {
  Write-Host "[team-report] $msg" -ForegroundColor Cyan
}

function Stop-Port([int]$port) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($conn in $connections) {
    $procId = $conn.OwningProcess
    if ($procId -and $procId -ne 0) {
      Write-Step "Stopping process on port $port (PID=$procId)"
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
}

function Ensure-BackendEnv {
  $envFile = Join-Path $BackendDir ".env"
  $exampleFile = Join-Path $BackendDir ".env.example"
  if (-not (Test-Path $envFile)) {
    if (Test-Path $exampleFile) {
      Copy-Item $exampleFile $envFile
      Write-Step "Created backend/.env from .env.example"
    } else {
      $secret = "dev-secret-{0}" -f (Get-Random -Maximum 999999)
      "PORT=3000`nJWT_SECRET=$secret" | Set-Content -Path $envFile -Encoding UTF8
      Write-Step "Created default backend/.env"
    }
  }
}

function Ensure-NpmInstall([string]$dir, [string]$name, [string]$binName) {
  $binPath = Join-Path $dir "node_modules\.bin\$binName.cmd"
  if (-not (Test-Path $binPath)) {
    Write-Step "$name dependencies incomplete, running npm install ..."
    Push-Location $dir
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed: $name" }
    Pop-Location
    if (-not (Test-Path $binPath)) {
      throw "Still missing $binName after npm install in $name"
    }
  }
}

function Start-BackgroundNpm([string]$name, [string]$workDir) {
  New-Item -ItemType Directory -Force -Path $DevDir | Out-Null
  $logOut = Join-Path $DevDir "$name.out.log"
  $logErr = Join-Path $DevDir "$name.err.log"

  $npmCmd = Join-Path $env:ProgramFiles "nodejs\npm.cmd"
  if (-not (Test-Path $npmCmd)) {
    $found = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($found) { $npmCmd = $found.Source }
  }
  if (-not (Test-Path $npmCmd)) { $npmCmd = "npm.cmd" }

  $proc = Start-Process -FilePath $npmCmd `
    -ArgumentList @("run", "dev") `
    -WorkingDirectory $workDir `
    -WindowStyle Hidden `
    -PassThru `
    -RedirectStandardOutput $logOut `
    -RedirectStandardError $logErr

  Write-Step "Started $name in background (PID=$($proc.Id), logs: .dev\$name.*.log)"
}

function Wait-Url([string]$url, [string]$label, [int]$timeoutSec = 30) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
        Write-Step "$label is ready: $url"
        return
      }
    } catch {
      Start-Sleep -Milliseconds 800
    }
  }
  Write-Host "[team-report] $label not ready within ${timeoutSec}s. Check .dev logs." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Team Report Dev Restart" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Step "Stopping old processes ..."
Stop-Port $BackendPort
Stop-Port $FrontendPort
Start-Sleep -Seconds 1

Ensure-BackendEnv
Ensure-NpmInstall $BackendDir "backend" "nodemon"
Ensure-NpmInstall $FrontendDir "frontend" "vite"

Write-Step "Starting backend on port $BackendPort ..."
Start-BackgroundNpm "backend" $BackendDir
Start-Sleep -Seconds 2

Write-Step "Starting frontend on port $FrontendPort ..."
Start-BackgroundNpm "frontend" $FrontendDir

Write-Host ""
Wait-Url "http://localhost:$BackendPort/api/v1/health" "Backend"
Wait-Url "http://localhost:$FrontendPort/login" "Frontend"

Write-Host ""
Write-Host "Services running in background (no extra windows)." -ForegroundColor Green
Write-Host "  Login:  http://localhost:$FrontendPort/login" -ForegroundColor White
Write-Host "  Health: http://localhost:$BackendPort/api/v1/health" -ForegroundColor White
Write-Host "  Logs:   .dev\backend.out.log / .dev\frontend.out.log" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Demo accounts:" -ForegroundColor DarkGray
Write-Host "  employee / employee123" -ForegroundColor DarkGray
Write-Host "  manager  / manager123" -ForegroundColor DarkGray
Write-Host "  admin    / admin123" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Stop: scripts\stop-dev.bat" -ForegroundColor DarkGray
Write-Host ""
