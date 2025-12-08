# How to Fix "Placeholder Values" Error

## The Problem

The error "HF_CHATBOT_API_URL contains placeholder values" means your backend server is still using old/default environment variables.

## Solution: Restart Backend with Correct Environment Variables

### Step 1: Stop Your Current Backend Server

1. Find the terminal/PowerShell window where your backend is running
2. Press `Ctrl + C` to stop it

### Step 2: Start Backend with Environment Variables

**Option A: Use the PowerShell Script (Easiest)**

```powershell
cd D:\Kinova\backend
.\start-backend-with-env.ps1
```

**Option B: Set Variables Manually**

Open a **NEW** PowerShell window and run:

```powershell
cd D:\Kinova\backend

# Set the environment variables
$env:HF_CHATBOT_API_URL = "https://elizaarora22-gait-analyzer-chatbot.hf.space/chat"
$env:HF_CHATBOT_API_TOKEN = "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"

# Verify they're set
Write-Host "URL: $env:HF_CHATBOT_API_URL"
Write-Host "Token: $($env:HF_CHATBOT_API_TOKEN.Substring(0, 10))..."

# Start the server
python -m uvicorn main:app --reload --port 8000
```

### Step 3: Verify It's Working

When the backend starts, you should see in the console:
```
Using Hugging Face URL: https://elizaarora22-gait-analyzer-chatbot.hf.space/chat
Detected Space API endpoint: https://elizaarora22-gait-analyzer-chatbot.hf.space/chat
```

If you see a placeholder URL or an error, the environment variables weren't set correctly.

## Important Notes

1. **Environment variables are session-specific** - They only exist in the PowerShell session where you set them
2. **You MUST restart the backend** - Running the script won't affect an already-running server
3. **Use the same PowerShell window** - Don't close the window after setting variables, or they'll be lost

## Quick Test

After restarting, try sending a message in the chatbot. The error should be gone!

