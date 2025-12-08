# Using FastAPI Spaces with Your Backend

## Understanding FastAPI Spaces

If your Hugging Face Space uses FastAPI (not Gradio), the request/response format is different:

### FastAPI Request Format

FastAPI endpoints typically expect JSON with specific field names. Common formats:

1. **Message format** (most common for chat):
   ```json
   {"message": "your message here"}
   ```

2. **Text format**:
   ```json
   {"text": "your message here"}
   ```

3. **Input format**:
   ```json
   {"input": "your message here"}
   ```

### FastAPI Response Format

FastAPI typically returns:
```json
{
  "response": "bot's response",
  "message": "bot's response",
  "output": "bot's response"
}
```

## Current Implementation

The backend now tries these formats in order:
1. `{"message": "..."}` - FastAPI chat format
2. `{"text": "..."}` - FastAPI text format
3. `{"input": "..."}` - FastAPI input format
4. `{"query": "..."}` - FastAPI query format
5. `{"data": [...]}` - Gradio format (fallback)
6. Direct string (fallback)

## Finding Your FastAPI Endpoint

1. **Check your Space's API docs:**
   - Visit: `https://elizaarora22-gait-analyzer-chatbot.hf.space/docs`
   - This shows all available endpoints

2. **Common FastAPI endpoints:**
   - `/chat` - Chat endpoint
   - `/predict` - Prediction endpoint
   - `/api/chat` - API chat endpoint
   - `/api/predict` - API prediction endpoint

3. **Check the endpoint's expected format:**
   - Look at the `/docs` page
   - See what fields the endpoint expects
   - Update the payload format in `backend/main.py` if needed

## Updating the Endpoint URL

If your FastAPI endpoint is different from `/chat`, update the URL in `backend/main.py`:

```python
HF_CHATBOT_API_URL_DEFAULT = "https://elizaarora22-gait-analyzer-chatbot.hf.space/chat"
```

Change `/chat` to your actual endpoint (e.g., `/predict`, `/api/chat`, etc.)

## Testing Your FastAPI Space

You can test your Space directly:

```bash
curl -X POST "https://elizaarora22-gait-analyzer-chatbot.hf.space/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

Or use the Space's interactive docs at:
```
https://elizaarora22-gait-analyzer-chatbot.hf.space/docs
```

## Troubleshooting

### 422 Unprocessable Entity
- The request format doesn't match what the endpoint expects
- Check the `/docs` page to see the exact format needed
- Update the payload formats in `backend/main.py` if needed

### 404 Not Found
- The endpoint path is wrong
- Check your Space's API documentation
- Try `/docs` to see available endpoints

### Still Not Working?
1. Check your Space's `/docs` page
2. See what format the endpoint expects
3. Share the endpoint details and I can help update the code

