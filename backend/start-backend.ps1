# Complete Backend Startup Script
# This script sets environment variables and starts the backend in the same session

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Backend with Environment Variables" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set your Hugging Face model URL
$env:HF_CHATBOT_API_URL = "https://elizaarora22-gait-analyzer-chatbot.hf.space/chat"

# Set your Hugging Face API token
$env:HF_CHATBOT_API_TOKEN = "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"

# Verify environment variables are set
Write-Host "Environment Variables:" -ForegroundColor Green
Write-Host "  HF_CHATBOT_API_URL: $env:HF_CHATBOT_API_URL" -ForegroundColor Yellow
Write-Host "  HF_CHATBOT_API_TOKEN: $($env:HF_CHATBOT_API_TOKEN.Substring(0, [Math]::Min(15, $env:HF_CHATBOT_API_TOKEN.Length)))..." -ForegroundColor Yellow
Write-Host ""

# Check for placeholder values
if ($env:HF_CHATBOT_API_URL -like "*your-username*" -or $env:HF_CHATBOT_API_URL -like "*your-model-name*") {
    Write-Host "ERROR: Environment variable contains placeholder values!" -ForegroundColor Red
    Write-Host "Please update the URL in this script." -ForegroundColor Red
    exit 1
}

Write-Host "Starting backend server..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Start the server
python -m uvicorn main:app --reload --port 8000

