# ============================================
# QUICK FIX SCRIPT - Run this to fix the error
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "  FIXING BACKEND ENVIRONMENT VARIABLES" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# Step 1: Stop any running backend processes
Write-Host "Step 1: Stopping any running backend processes..." -ForegroundColor Yellow
$backendProcesses = Get-Process python -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*uvicorn*" -or $_.Path -like "*uvicorn*"
}
if ($backendProcesses) {
    Write-Host "Found $($backendProcesses.Count) Python process(es). Stopping..." -ForegroundColor Yellow
    $backendProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "✓ Processes stopped" -ForegroundColor Green
} else {
    Write-Host "✓ No backend processes found running" -ForegroundColor Green
}

Write-Host ""

# Step 2: Set environment variables
Write-Host "Step 2: Setting environment variables..." -ForegroundColor Yellow
$env:HF_CHATBOT_API_URL = "https://elizaarora22-gait-analyzer-chatbot.hf.space/chat"
$env:HF_CHATBOT_API_TOKEN = "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"

# Verify
Write-Host "  HF_CHATBOT_API_URL: $env:HF_CHATBOT_API_URL" -ForegroundColor Cyan
Write-Host "  HF_CHATBOT_API_TOKEN: $($env:HF_CHATBOT_API_TOKEN.Substring(0, 15))..." -ForegroundColor Cyan

# Check for placeholders
if ($env:HF_CHATBOT_API_URL -like "*your-username*" -or $env:HF_CHATBOT_API_URL -like "*your-model-name*") {
    Write-Host ""
    Write-Host "ERROR: Still contains placeholder values!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Environment variables set correctly" -ForegroundColor Green
Write-Host ""

# Step 3: Verify Python can see them
Write-Host "Step 3: Verifying Python can read environment variables..." -ForegroundColor Yellow
$testResult = python -c "import os; url = os.getenv('HF_CHATBOT_API_URL', 'NOT_SET'); print('Python sees URL:', url)"
Write-Host "  $testResult" -ForegroundColor Cyan

if ($testResult -like "*your-username*" -or $testResult -like "*NOT_SET*") {
    Write-Host ""
    Write-Host "WARNING: Python cannot see the environment variable!" -ForegroundColor Red
    Write-Host "This might be a PATH or Python installation issue." -ForegroundColor Yellow
} else {
    Write-Host "✓ Python can read the environment variable" -ForegroundColor Green
}

Write-Host ""

# Step 4: Start the backend
Write-Host "Step 4: Starting backend server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Backend starting on http://localhost:8000" -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Change to backend directory
Set-Location $PSScriptRoot

# Start the server
python -m uvicorn main:app --reload --port 8000

