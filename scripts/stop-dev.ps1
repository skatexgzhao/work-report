# Team Report V1 - 停止开发服务
# 用法: powershell -ExecutionPolicy Bypass -File scripts/stop-dev.ps1

$BackendPort = 3000
$FrontendPort = 5173

function Stop-Port($port) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  $stopped = 0
  foreach ($conn in $connections) {
    $procId = $conn.OwningProcess
    if ($procId -and $procId -ne 0) {
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
      $stopped++
      Write-Host "[team-report] 已停止端口 $port PID=$procId" -ForegroundColor Yellow
    }
  }
  if ($stopped -eq 0) {
    Write-Host "[team-report] 端口 $port 无运行中的服务" -ForegroundColor DarkGray
  }
}

Write-Host ""
Write-Host "停止 Team Report 开发服务 ..." -ForegroundColor Cyan
Stop-Port $BackendPort
Stop-Port $FrontendPort
Write-Host "完成。" -ForegroundColor Green
Write-Host ""
