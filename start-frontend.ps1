# ============================================
# KINOVA FRONTEND SERVER - FRESH START
# ============================================
# This script starts the Vite development server
# Run this from the project root directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  KINOVA FRONTEND SERVER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the project root
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "Make sure you're in the project root directory." -ForegroundColor Yellow
    exit 1
}

# Check Node.js installation
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeCheck = node --version 2>&1
if (-not $?) {
    Write-Host "✗ Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js 18 or higher" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Node.js $nodeCheck" -ForegroundColor Green

# Check npm
$npmCheck = npm --version 2>&1
if (-not $?) {
    Write-Host "✗ npm not found!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ npm $npmCheck" -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if (-not $?) {
        Write-Host "✗ Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Frontend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Frontend URL: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the development server
npm run dev
