# Fix: Stop Old Backend and Start Fresh

## The Problem
Your backend is still running with old environment variables. You need to **stop it completely** and **restart it** with the new variables.

## Solution (Do This Now)

### Step 1: Stop ALL Backend Processes

**Option A: Find and Stop Manually**
1. Find the PowerShell/terminal window where your backend is running
2. Press `Ctrl + C` to stop it
3. If that doesn't work, close that terminal window

**Option B: Kill All Python Processes (Nuclear Option)**
⚠️ **Warning:** This will stop ALL Python processes on your computer!

```powershell
# Stop all Python processes (be careful!)
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Step 2: Start Backend with Correct Environment Variables

I've created a new script for you. Run this:

```powershell
cd D:\Kinova\backend
.\start-backend.ps1
```

**OR manually:**

```powershell
cd D:\Kinova\backend

# Set environment variables (IMPORTANT: Do this in the SAME session)
$env:HF_CHATBOT_API_URL = "https://elizaarora22-gait-analyzer-chatbot.hf.space/chat"
$env:HF_CHATBOT_API_TOKEN = "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"

# Verify they're set (should show your URL, NOT placeholder)
Write-Host "URL: $env:HF_CHATBOT_API_URL"

# Start server
python -m uvicorn main:app --reload --port 8000
```

### Step 3: Verify It's Working

**Check 1: Look at console output**
When backend starts, you should see:
```
Using Hugging Face URL: https://elizaarora22-gait-analyzer-chatbot.hf.space/chat
Detected Space API endpoint: https://elizaarora22-gait-analyzer-chatbot.hf.space/chat
```

**Check 2: Test debug endpoint**
Open browser: `http://localhost:8000/debug/env`

Should show:
```json
{
  "HF_CHATBOT_API_URL": "https://elizaarora22-gait-analyzer-chatbot.hf.space/chat",
  "has_placeholder": false,
  "is_space_api": true
}
```

### Step 4: Test Chatbot

After verifying the debug endpoint shows the correct URL, try the chatbot again!

## Critical Points

1. **Environment variables are session-specific** - Set them in the SAME PowerShell window where you start the backend
2. **Old processes must be stopped** - The backend won't see new variables until restarted
3. **Check the debug endpoint** - It shows exactly what the backend sees

## If It Still Doesn't Work

1. Make sure you're setting variables in the SAME PowerShell session
2. Make sure the backend is completely stopped before restarting
3. Check the debug endpoint to see what URL the backend is actually using
4. Share the debug endpoint output if you need more help

