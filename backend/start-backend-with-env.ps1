# PowerShell script to start the backend with Hugging Face environment variables
# Replace the values below with your actual Hugging Face credentials

# Set your Hugging Face model URL
# Option 1: Use Space URL (will auto-convert to Space API endpoint)
$env:HF_CHATBOT_API_URL = "https://elizaarora22-gait-analyzer-chatbot.hf.space/chat"

# Option 2: Use Space API endpoint directly (if Option 1 doesn't work)
# $env:HF_CHATBOT_API_URL = "https://khushal-grover2005-gait-ml.hf.space/api"

# Option 3: Use Model Inference API (if you have a model, not just a Space)
# $env:HF_CHATBOT_API_URL = "https://router.huggingface.co/models/khushal-grover2005/your-model-name"

# Set your Hugging Face API token
# Get this from: https://huggingface.co/settings/tokens
$env:HF_CHATBOT_API_TOKEN = "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"

# Start the backend server
Write-Host "Starting backend server with Hugging Face configuration..."
Write-Host "HF_CHATBOT_API_URL: $env:HF_CHATBOT_API_URL"
Write-Host "HF_CHATBOT_API_TOKEN: $($env:HF_CHATBOT_API_TOKEN.Substring(0, [Math]::Min(10, $env:HF_CHATBOT_API_TOKEN.Length)))..." -ForegroundColor Green

python -m uvicorn main:app --reload --port 8000

