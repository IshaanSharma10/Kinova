# PowerShell script to start the backend server
Write-Host "Starting Kinova Backend Server..." -ForegroundColor Cyan

# Check if we're in the backend directory
if (-not (Test-Path "main.py")) {
    Write-Host "Error: main.py not found. Make sure you're in the backend directory." -ForegroundColor Red
    Write-Host "Run: cd backend" -ForegroundColor Yellow
    exit 1
}

# Check if Python is available
try {
    $pythonVersion = python --version
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Check if dependencies are installed
Write-Host "`nChecking dependencies..." -ForegroundColor Yellow
try {
    python -c "import fastapi, uvicorn, cv2" 2>$null
    Write-Host "Dependencies OK" -ForegroundColor Green
} catch {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Start the server
Write-Host "`nStarting FastAPI server on http://localhost:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Yellow

uvicorn main:app --reload --port 8000



