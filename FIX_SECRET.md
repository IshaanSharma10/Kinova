# How to Fix GitHub Secret Scanning Error

GitHub detected a Hugging Face API token in your git history. Here's how to fix it:

## Quick Fix (Recommended)

### Step 1: Remove the secret from git history

Run these commands in PowerShell:

```powershell
# Check the commit that contains the secret
git show 9be2d0c12b9c436b21b7747d9844248b4609f325:src/pages/Chatbot.tsx | Select-String -Pattern "hf_"

# Remove the file from git history using filter-branch
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch src/pages/Chatbot.tsx" --prune-empty --tag-name-filter cat -- --all

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Step 2: Force push (WARNING: This rewrites history!)

```powershell
git push origin main --force
```

**⚠️ IMPORTANT:** Only do this if you're the only one working on this branch, or coordinate with your team first!

## Alternative: Use BFG Repo-Cleaner (Easier)

1. Download BFG from: https://rtyley.github.io/bfg-repo-cleaner/
2. Run:
```powershell
java -jar bfg.jar --delete-files Chatbot.tsx
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin main --force
```

## Alternative: Allow the Secret (Not Recommended)

If you can't rewrite history, you can allow the secret:
1. Visit: https://github.com/IshaanSharma10/Kinova/security/secret-scanning/unblock-secret/36HJaR0sbXlMxYs7EwZvGdApF5U
2. Click "Allow secret" (NOT recommended for security)

## Prevention: Use Environment Variables

After fixing, always use environment variables for secrets:

1. Create `.env` file (already added to .gitignore):
```
VITE_HUGGINGFACE_API_TOKEN=your_token_here
VITE_HUGGINGFACE_SPACE_URL=https://elizaarora22-gait-analyzer-chatbot.hf.space
```

2. In your code, use:
```typescript
const API_TOKEN = import.meta.env.VITE_HUGGINGFACE_API_TOKEN || '';
const SPACE_URL = import.meta.env.VITE_HUGGINGFACE_SPACE_URL || '';
```

3. Never commit `.env` files!






