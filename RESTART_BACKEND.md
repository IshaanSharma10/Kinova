# How to Restart Backend with New Environment Variables

## The Problem

The error shows a placeholder URL because the backend server is still using **old environment variables** or wasn't restarted after you updated them.

## Solution: Restart the Backend

### Step 1: Stop the Current Backend

In the terminal where your backend is running:
- Press `Ctrl + C` to stop the server

### Step 2: Start Backend with Updated Environment Variables

Run your PowerShell script:

```powershell
cd D:\Kinova\backend
.\start-backend-with-env.ps1
```

This will:
1. Set the environment variables (including your new Space URL)
2. Start the backend server

### Step 3: Verify the URL is Correct

When the backend starts, you should see in the console:
```
Using Hugging Face URL: https://elizaarora22-gait-analyzer-chatbot.hf.space/chat
Detected Space API endpoint: https://elizaarora22-gait-analyzer-chatbot.hf.space/chat
```

If you see a placeholder URL or the old URL, the environment variable wasn't set correctly.

## Alternative: Set Environment Variables Manually

If the script doesn't work, set them manually before starting:

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

## Important Notes

1. **Environment variables are session-specific** - They only exist in the PowerShell session where you set them
2. **Restart required** - The backend must be restarted to pick up new environment variables
3. **Check the logs** - The backend will print the URL it's using when it starts

## Testing

After restarting, try sending a message in the chatbot. The backend will:
- Detect it's a Space API endpoint
- Try different payload formats automatically
- Return the chatbot's response

If you still get errors, check the backend console logs for more details.

