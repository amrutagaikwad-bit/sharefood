param([int]$Port = 5000)
$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $connections) { Write-Host "Port $Port is free."; exit 0 }
$pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $pids) {
  Write-Host "Stopping PID $procId on port $Port..."
  Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
}
Write-Host "Port $Port is free."
