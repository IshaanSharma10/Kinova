# Hugging Face Chatbot Integration Setup Guide

This guide will help you integrate your Hugging Face chatbot model into the application.

## Prerequisites

1. A Hugging Face account
2. A chatbot model uploaded to Hugging Face
3. A Hugging Face API token

## Step 1: Get Your Hugging Face API Token

1. Go to [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Click "New token"
3. Give it a name (e.g., "Kinova Chatbot")
4. Select "Read" permissions
5. Copy the token (you won't be able to see it again!)

## Step 2: Find Your Model API URL

Your model API URL follows this format:
```
https://api-inference.huggingface.co/models/your-username/your-model-name
```

For example, if your username is `john_doe` and your model is `gait-chatbot`, the URL would be:
```
https://api-inference.huggingface.co/models/john_doe/gait-chatbot
```

## Step 3: Configure Environment Variables

### For Backend (Python/FastAPI)

Create a `.env` file in the `backend/` directory (or set environment variables):

```bash
HF_CHATBOT_API_URL=https://api-inference.huggingface.co/models/your-username/your-model-name
HF_CHATBOT_API_TOKEN=your-token-here
```

### Alternative: Set Environment Variables Directly

**Windows (PowerShell):**
```powershell
$env:HF_CHATBOT_API_URL="https://api-inference.huggingface.co/models/your-username/your-model-name"
$env:HF_CHATBOT_API_TOKEN="your-token-here"
```

**Linux/Mac:**
```bash
export HF_CHATBOT_API_URL="https://api-inference.huggingface.co/models/your-username/your-model-name"
export HF_CHATBOT_API_TOKEN="your-token-here"
```

## Step 4: Install Backend Dependencies

Make sure you have the required Python packages:

```bash
cd backend
pip install -r requirements.txt
```

The `httpx` package is now included for making HTTP requests to Hugging Face.

## Step 5: Start the Backend Server

```bash
cd backend
uvicorn main:app --reload --port 8000
```

## Step 6: Test the Integration

1. Start your frontend development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Chatbot page in your application

3. Try sending a message - it should now use your Hugging Face model!

## Troubleshooting

### "Model is loading" Error

If you see this message, your model is being loaded on Hugging Face's servers. This happens:
- The first time you use the model
- After the model has been inactive for a while

**Solution:** Wait 30-60 seconds and try again. The model will stay loaded for a period of time after first use.

### "Credentials not configured" Error

This means the environment variables aren't set correctly.

**Solution:**
1. Check that you've set `HF_CHATBOT_API_URL` and `HF_CHATBOT_API_TOKEN`
2. Make sure the backend server was restarted after setting the variables
3. Verify the token has "Read" permissions

### Timeout Errors

If requests are timing out:

**Solution:**
1. Check your internet connection
2. Verify the model URL is correct
3. Try a simpler/shorter message first
4. Some models are slower than others - this is normal

### Model Response Format Issues

If the chatbot isn't responding correctly, your model might use a different response format.

**Solution:** Check the `backend/main.py` file, specifically the `/chatbot` endpoint. You may need to adjust the response parsing logic based on your model's output format.

## Model Response Formats Supported

The backend currently supports these response formats:

1. **Direct text:** `{"generated_text": "response text"}`
2. **Array format:** `[{"generated_text": "response text"}]`
3. **Chat API format:** `{"choices": [{"message": {"content": "response text"}}]}`
4. **Simple text:** `{"text": "response text"}`

If your model uses a different format, you'll need to update the parsing logic in `backend/main.py`.

## Security Notes

- ✅ The API token is stored server-side only (in the backend)
- ✅ The frontend never sees or handles the token directly
- ✅ All requests go through your backend API proxy
- ⚠️ Never commit your `.env` file or expose your token in client-side code

## Next Steps

- Customize the system prompt or conversation context
- Adjust temperature and max tokens for your use case
- Add conversation history management
- Implement rate limiting if needed

## Need Help?

- [Hugging Face Inference API Docs](https://huggingface.co/docs/api-inference/index)
- [Hugging Face Model Hub](https://huggingface.co/models)

