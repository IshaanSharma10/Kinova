# ============================================
# RESTART BACKEND WITH CORRECT ENVIRONMENT VARIABLES
# Run this script to fix the placeholder error
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESTARTING BACKEND WITH CORRECT CONFIG" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop any existing backend
Write-Host "Step 1: Stopping existing backend..." -ForegroundColor Yellow
try {
    $port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if ($port8000) {
        $pid = $port8000.OwningProcess
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Stopped process on port 8000" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "✓ No process found on port 8000" -ForegroundColor Green
    }
} catch {
    Write-Host "✓ No process to stop" -ForegroundColor Green
}

Write-Host ""

# Step 2: Set environment variables
Write-Host "Step 2: Setting environment variables..." -ForegroundColor Yellow
$env:HF_CHATBOT_API_URL = "https://elizaarora22-gait-analyzer-chatbot.hf.space/chat"
$env:HF_CHATBOT_API_TOKEN = "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"

# Verify they're set
Write-Host "  HF_CHATBOT_API_URL: $env:HF_CHATBOT_API_URL" -ForegroundColor Cyan
Write-Host "  HF_CHATBOT_API_TOKEN: $($env:HF_CHATBOT_API_TOKEN.Substring(0, 15))..." -ForegroundColor Cyan

# Check for placeholders
if ($env:HF_CHATBOT_API_URL -like "*your-username*" -or $env:HF_CHATBOT_API_URL -like "*your-model-name*") {
    Write-Host ""
    Write-Host "ERROR: URL still contains placeholder values!" -ForegroundColor Red
    Write-Host "Please check the script and update the URL." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Environment variables set correctly" -ForegroundColor Green
Write-Host ""

# Step 3: Verify Python can see them
Write-Host "Step 3: Verifying Python can read environment variables..." -ForegroundColor Yellow
$pythonTest = python -c "import os; url = os.getenv('HF_CHATBOT_API_URL', 'NOT_SET'); print(url)" 2>&1
Write-Host "  Python sees: $pythonTest" -ForegroundColor Cyan

if ($pythonTest -like "*your-username*" -or $pythonTest -like "*your-model-name*" -or $pythonTest -eq "NOT_SET") {
    Write-Host ""
    Write-Host "WARNING: Python cannot see the correct environment variable!" -ForegroundColor Red
    Write-Host "This might indicate a Python path issue." -ForegroundColor Yellow
} else {
    Write-Host "✓ Python can read the environment variable" -ForegroundColor Green
}

Write-Host ""

# Step 4: Change to backend directory
Set-Location $PSScriptRoot

# Step 5: Start the backend
Write-Host "Step 4: Starting backend server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Backend starting..." -ForegroundColor Green
Write-Host "  URL: http://localhost:8000" -ForegroundColor Green
Write-Host "  Debug: http://localhost:8000/debug/env" -ForegroundColor Cyan
Write-Host ""
Write-Host "  After it starts, check the debug endpoint" -ForegroundColor Yellow
Write-Host "  to verify has_placeholder: false" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Start the server
python -m uvicorn main:app --reload --port 8000

