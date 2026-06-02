# FoodBridge — start backend + frontend in one command (PowerShell)
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

if (-not (Test-Path ".\backend\node_modules")) {
  Write-Host "Installing backend dependencies..."
  npm install --prefix backend
}
if (-not (Test-Path ".\frontend\node_modules")) {
  Write-Host "Installing frontend dependencies..."
  npm install --prefix frontend
}

Write-Host "Starting FoodBridge (backend :5000, frontend :5173)..."
npm run dev
