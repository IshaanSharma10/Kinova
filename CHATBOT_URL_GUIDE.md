# Hugging Face Chatbot URL Configuration Guide

## Important: API Endpoint Change

Hugging Face has **deprecated** the old endpoint:
- ❌ `https://api-inference.huggingface.co` (no longer supported)

And now requires:
- ✅ `https://router.huggingface.co` (new endpoint)

## URL Formats

### Option 1: Using Inference API (Recommended)

If your Space has a model, use the model's Inference API URL:

```
https://router.huggingface.co/models/your-username/your-model-name
```

**Example:**
```
https://router.huggingface.co/models/khushal-grover2005/gait-ml
```

### Option 2: Using Space API

If you want to use the Space's custom API endpoint:

```
https://owner-space-name.hf.space/api
```

**Example (for your Space):**
```
https://khushal-grover2005-gait-ml.hf.space/api
```

**Note:** Space APIs may have different request/response formats, so you might need to adjust the backend code.

## How to Find Your Model Name

1. Go to your Space: https://huggingface.co/spaces/khushal-grover2005/gait-ml
2. Check if there's a model linked to the Space
3. Look for a "Model" tab or check the Space's README
4. The model name is usually in the format: `username/model-name`

## Current Configuration

Your current URL in `start-backend-with-env.ps1`:
- Space URL: `https://huggingface.co/spaces/khushal-grover2005/gait-ml`

**Recommended change:**
- Use the model's Inference API: `https://router.huggingface.co/models/khushal-grover2005/gait-ml`

Or if the model has a different name:
- `https://router.huggingface.co/models/khushal-grover2005/your-actual-model-name`

## Testing

After updating the URL, restart your backend server and try the chatbot again. The backend will automatically:
- Convert old `api-inference.huggingface.co` URLs to use `router.huggingface.co`
- Convert Space URLs to Space API endpoints (if needed)

## Troubleshooting

If you get errors:
1. **"Model not found"** - Check that the model name is correct
2. **"Invalid URL format"** - Make sure you're using the router endpoint
3. **"Space API error"** - The Space might not expose a standard API; use the model's Inference API instead

