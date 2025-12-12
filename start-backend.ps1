# ============================================
# KINOVA BACKEND SERVER - FRESH START
# ============================================
# This script starts the FastAPI backend server
# Run this from the project root directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  KINOVA BACKEND SERVER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to backend directory
if (-not (Test-Path "backend")) {
    Write-Host "ERROR: 'backend' directory not found!" -ForegroundColor Red
    Write-Host "Make sure you're in the project root directory." -ForegroundColor Yellow
    exit 1
}

Set-Location backend

# Check Python installation
Write-Host "Checking Python..." -ForegroundColor Yellow
$pythonCheck = python --version 2>&1
if (-not $?) {
    Write-Host "✗ Python not found!" -ForegroundColor Red
    Write-Host "Please install Python 3.8 or higher" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ $pythonCheck" -ForegroundColor Green

# Check if virtual environment exists (optional)
if (Test-Path "venv\Scripts\activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & .\venv\Scripts\activate.ps1
    Write-Host "✓ Virtual environment activated" -ForegroundColor Green
}

# Check and install dependencies
Write-Host "Checking dependencies..." -ForegroundColor Yellow
$null = python -c "import fastapi, uvicorn, cv2, mediapipe" 2>&1
if (-not $?) {
    Write-Host "Installing dependencies from requirements.txt..." -ForegroundColor Yellow
    pip install -r requirements.txt
    if (-not $?) {
        Write-Host "✗ Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✓ All dependencies installed" -ForegroundColor Green
}

# Set environment variables (optional - can be overridden)
if (-not $env:HF_CHATBOT_API_URL) {
    $env:HF_CHATBOT_API_URL = "https://elizaarora22-gait-analyzer-chatbot.hf.space/chat"
    Write-Host "Using default HF_CHATBOT_API_URL" -ForegroundColor Gray
}

if (-not $env:HF_CHATBOT_API_TOKEN) {
    $env:HF_CHATBOT_API_TOKEN = "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"
    Write-Host "Using default HF_CHATBOT_API_TOKEN" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Backend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Server URL: http://localhost:8000" -ForegroundColor Green
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
