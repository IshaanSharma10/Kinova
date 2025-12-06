# PowerShell script to remove secret from git history
# This script will help you clean up the git history

Write-Host "=== Removing Secret from Git History ===" -ForegroundColor Cyan
Write-Host ""

# Check if we're in a git repository
if (-not (Test-Path .git)) {
    Write-Host "Error: Not in a git repository!" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Setting environment variable to suppress warning..." -ForegroundColor Yellow
$env:FILTER_BRANCH_SQUELCH_WARNING = "1"

Write-Host "Step 2: Removing Chatbot.tsx from all git history..." -ForegroundColor Yellow
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch src/pages/Chatbot.tsx" --prune-empty --tag-name-filter cat -- --all

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nStep 3: Cleaning up git references..." -ForegroundColor Yellow
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
    
    Write-Host "`n✅ Successfully removed secret from git history!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Verify the secret is gone: git log --all --full-history -- src/pages/Chatbot.tsx" -ForegroundColor Gray
    Write-Host "2. Force push to GitHub: git push origin main --force" -ForegroundColor Yellow
    Write-Host "   ⚠️  WARNING: Force push rewrites history. Coordinate with your team!" -ForegroundColor Red
} else {
    Write-Host "`n❌ Error occurred. Try using BFG Repo-Cleaner instead." -ForegroundColor Red
    Write-Host "Download from: https://rtyley.github.io/bfg-repo-cleaner/" -ForegroundColor Gray
}


