"""
Ollama Local Chatbot Integration
Free, runs models locally on your machine
"""
import httpx
import os

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama2")  # or "mistral", "codellama", etc.

async def get_ollama_response(message: str, conversation_history: list = None):
    """
    Get response from local Ollama model
    
    Args:
        message: User's message
        conversation_history: Previous messages for context
    
    Returns:
        str: Bot's response
    """
    # Build context from conversation history
    context = ""
    if conversation_history:
        for msg in conversation_history[-5:]:  # Keep last 5 messages
            role = msg.get("role", "user")
            content = msg.get("content", "")
            context += f"{role.capitalize()}: {content}\n"
    
    # Build prompt
    prompt = f"""You are a helpful gait analysis assistant. You help users understand gait parameters.

{context}
User: {message}
Assistant:"""
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "").strip()
            else:
                raise Exception(f"Ollama API error: {response.status_code} - {response.text}")
    except httpx.TimeoutException:
        raise Exception("Ollama request timed out. Make sure Ollama is running.")
    except Exception as e:
        raise Exception(f"Ollama error: {str(e)}")

