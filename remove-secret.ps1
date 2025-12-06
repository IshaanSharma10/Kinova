# PowerShell script to remove secret from git history
# Run this script to clean up the git history

Write-Host "Removing secret from git history..." -ForegroundColor Yellow

# Step 1: Use git filter-branch or BFG to remove the file from history
# Since the file is already deleted, we'll use git filter-repo or interactive rebase

Write-Host "`nStep 1: Checking git status..." -ForegroundColor Cyan
git status

Write-Host "`nStep 2: To remove the secret from history, you have two options:" -ForegroundColor Cyan
Write-Host "`nOption A: Use git filter-repo (Recommended)" -ForegroundColor Green
Write-Host "  Install: pip install git-filter-repo" -ForegroundColor Gray
Write-Host "  Run: git filter-repo --path src/pages/Chatbot.tsx --invert-paths" -ForegroundColor Gray

Write-Host "`nOption B: Use BFG Repo-Cleaner (Easier)" -ForegroundColor Green
Write-Host "  1. Download BFG from: https://rtyley.github.io/bfg-repo-cleaner/" -ForegroundColor Gray
Write-Host "  2. Run: java -jar bfg.jar --delete-files Chatbot.tsx" -ForegroundColor Gray
Write-Host "  3. Run: git reflog expire --expire=now --all && git gc --prune=now --aggressive" -ForegroundColor Gray

Write-Host "`nOption C: Manual cleanup (if above don't work)" -ForegroundColor Green
Write-Host "  1. git rebase -i HEAD~5  (interactive rebase)" -ForegroundColor Gray
Write-Host "  2. Mark commits with secret as 'edit'" -ForegroundColor Gray
Write-Host "  3. Remove the secret line and continue rebase" -ForegroundColor Gray

Write-Host "`nAfter cleaning history, force push:" -ForegroundColor Yellow
Write-Host "  git push origin main --force" -ForegroundColor Red
Write-Host "`nWARNING: Force push will rewrite history. Make sure you coordinate with your team!" -ForegroundColor Red


