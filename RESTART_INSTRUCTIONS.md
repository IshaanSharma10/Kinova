# Step-by-Step: Fix the Placeholder Values Error

## The Problem
Your backend server is still using old environment variables with placeholder values. You need to **restart the backend** to pick up the new values.

## Solution (Follow These Steps Exactly)

### Step 1: Stop the Backend Server

1. **Find the terminal/PowerShell window** where your backend is running
   - Look for a window showing "Uvicorn running on http://127.0.0.1:8000"
   - Or any window with Python/backend output

2. **Stop the server:**
   - Click on that terminal window
   - Press `Ctrl + C` (hold Ctrl, press C)
   - You should see the server stop

### Step 2: Start Backend with Correct Environment Variables

**Open a NEW PowerShell window** (or use the same one after stopping):

```powershell
# Navigate to backend directory
cd D:\Kinova\backend

# Run the startup script
.\start-backend-with-env.ps1
```

**OR manually set variables and start:**

```powershell
cd D:\Kinova\backend

# Set environment variables
$env:HF_CHATBOT_API_URL = "https://elizaarora22-gait-analyzer-chatbot.hf.space/chat"
$env:HF_CHATBOT_API_TOKEN = "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"

# Verify (you should see your URL, not placeholder)
Write-Host "URL: $env:HF_CHATBOT_API_URL"

# Start server
python -m uvicorn main:app --reload --port 8000
```

### Step 3: Verify It's Working

**Check 1: Look at the console output when backend starts**

You should see:
```
Using Hugging Face URL: https://elizaarora22-gait-analyzer-chatbot.hf.space/chat
Detected Space API endpoint: https://elizaarora22-gait-analyzer-chatbot.hf.space/chat
```

**Check 2: Test the debug endpoint**

Open your browser and go to:
```
http://localhost:8000/debug/env
```

You should see:
```json
{
  "HF_CHATBOT_API_URL": "https://elizaarora22-gait-analyzer-chatbot.hf.space/chat",
  "HF_CHATBOT_API_TOKEN": "hf_tMgVzkw...",
  "has_placeholder": false,
  "is_space_api": true
}
```

If you see `"has_placeholder": true` or the URL contains "your-username", the environment variable wasn't set correctly.

### Step 4: Test the Chatbot

After verifying the backend is using the correct URL, try sending a message in the chatbot. The error should be gone!

## Common Issues

### Issue: "Environment variable still shows placeholder"
**Solution:** Make sure you:
1. Stopped the old backend completely
2. Set the variables in the SAME PowerShell session where you start the backend
3. Didn't close the PowerShell window after setting variables

### Issue: "Backend won't start"
**Solution:** Check for errors in the console. Common issues:
- Port 8000 already in use → Change port or stop other process
- Python not found → Make sure Python is in your PATH
- Missing dependencies → Run `pip install -r requirements.txt`

### Issue: "Variables set but backend doesn't see them"
**Solution:** 
- Environment variables are **session-specific**
- You MUST set them in the same PowerShell session where you start the backend
- Don't set them in one window and start backend in another

## Quick Test Command

After starting the backend, run this in a browser or use curl:
```
http://localhost:8000/debug/env
```

This will show you exactly what the backend sees.

