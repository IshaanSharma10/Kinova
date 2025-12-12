# ============================================
# KINOVA - START BOTH SERVERS
# ============================================
# This script starts both frontend and backend servers
# Run this from the project root directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  KINOVA - STARTING ALL SERVERS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the project root
if (-not (Test-Path "package.json") -or -not (Test-Path "backend")) {
    Write-Host "ERROR: Invalid directory!" -ForegroundColor Red
    Write-Host "Make sure you're in the project root directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "This will start:" -ForegroundColor Yellow
Write-Host "  1. Backend server (http://localhost:8000)" -ForegroundColor White
Write-Host "  2. Frontend server (http://localhost:5173)" -ForegroundColor White
Write-Host ""
Write-Host "Opening in separate windows..." -ForegroundColor Cyan
Write-Host ""

# Start backend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\start-backend.ps1"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start frontend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\start-frontend.ps1"

Write-Host "✓ Both servers are starting in separate windows" -ForegroundColor Green
Write-Host ""
Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Close the PowerShell windows to stop the servers" -ForegroundColor Yellow


