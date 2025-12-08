"""
OpenAI Chatbot Integration
Alternative to Hugging Face Spaces
"""
import os
from openai import OpenAI

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

async def get_openai_response(message: str, conversation_history: list = None):
    """
    Get response from OpenAI GPT model
    
    Args:
        message: User's message
        conversation_history: Previous messages for context
    
    Returns:
        str: Bot's response
    """
    if not client.api_key:
        raise ValueError("OPENAI_API_KEY not set")
    
    # Build messages list
    messages = []
    
    # Add system message for context
    messages.append({
        "role": "system",
        "content": "You are a helpful gait analysis assistant. You help users understand gait parameters like cadence, equilibrium, postural sway, walking speed, and more. Provide clear, informative answers."
    })
    
    # Add conversation history
    if conversation_history:
        for msg in conversation_history[-10:]:  # Keep last 10 messages
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
    
    # Add current message
    messages.append({
        "role": "user",
        "content": message
    })
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # or "gpt-4" for better quality
            messages=messages,
            temperature=0.7,
            max_tokens=512
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        raise Exception(f"OpenAI API error: {str(e)}")

