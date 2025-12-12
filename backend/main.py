from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import cv2
import numpy as np
import json
import os
import httpx

app = FastAPI()

# ============================================
# EXERCISE COUNTER INSTANCES (Persistent State)
# ============================================
# Import counter classes
from counters.squat_counter import FinalSquatCounter
from counters.pushup_counter import FinalBalancedPushUpCounter
from counters.lunge_counter import FinalLungeCounter

# Create persistent counter instances (one per exercise type)
# These maintain state between frames
exercise_counters = {
    "squats": FinalSquatCounter(),
    "pushups": FinalBalancedPushUpCounter(),
    "lunges": FinalLungeCounter()
}

# ============================================
# HUGGING FACE CONFIGURATION
# ============================================
# If environment variables are not set, use these values
# Update these if environment variables don't work
HF_CHATBOT_API_URL_DEFAULT = "https://elizaarora22-gait-analyzer-chatbot.hf.space/chat"
HF_CHATBOT_API_TOKEN_DEFAULT = "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"

# Get from environment or use defaults
def get_hf_config():
    """Get Hugging Face configuration from environment or defaults"""
    url = os.getenv("HF_CHATBOT_API_URL", HF_CHATBOT_API_URL_DEFAULT)
    token = os.getenv("HF_CHATBOT_API_TOKEN", HF_CHATBOT_API_TOKEN_DEFAULT)
    
    # If environment variable contains placeholder, use default
    if "your-username" in url or "your-model-name" in url:
        print("WARNING: Environment variable contains placeholder, using default value")
        url = HF_CHATBOT_API_URL_DEFAULT
    
    if "your-token" in token or token == "":
        print("WARNING: Environment variable contains placeholder, using default value")
        token = HF_CHATBOT_API_TOKEN_DEFAULT
    
    return url, token

# CORS Configuration - Allow specific origins for production
import os
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]

# In development, allow all origins; in production, use specific origins
# Set ALLOWED_ORIGINS environment variable in production
if os.getenv("ENVIRONMENT") == "production" and allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Development: allow all origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/")
def home():
    return {"status": "Backend running!"}


@app.get("/debug/env")
def debug_env():
    """Debug endpoint to check environment variables"""
    hf_api_url, hf_api_token = get_hf_config()
    
    # Mask token for security
    token_preview = hf_api_token[:15] + "..." if hf_api_token else "NOT SET"
    
    return {
        "HF_CHATBOT_API_URL": hf_api_url,
        "HF_CHATBOT_API_TOKEN": token_preview,
        "has_placeholder": "your-username" in hf_api_url or "your-model-name" in hf_api_url,
        "is_space_api": ".hf.space" in hf_api_url,
        "source": "environment" if os.getenv("HF_CHATBOT_API_URL") and "your-username" not in os.getenv("HF_CHATBOT_API_URL", "") else "default"
    }


def process_frame_with_counter(workout_type: str, frame):
    """
    Process a frame using the persistent counter instance.
    This maintains state between frames (counter value, buffers, etc.)
    """
    if workout_type not in exercise_counters:
        raise ValueError(f"Unknown workout type: {workout_type}")
    
    counter = exercise_counters[workout_type]
    
    # Process the frame (this updates the counter state internally)
    processed_frame = counter.process_frame(frame)
    
    # Encode processed frame to JPEG
    _, jpeg = cv2.imencode(".jpg", processed_frame)
    
    # Return result with current counter state
    return {
        "frame": jpeg.tobytes().hex(),
        "count": counter.counter,
        "stage": counter.stage,
        "avg_speed": counter.avg_speed,
        "good_reps": counter.good_reps,
        "bad_reps": counter.bad_reps,
    }


@app.post("/process-frame")
async def process_frame(
    file: UploadFile,
    workout_type: str = Form(...)
):
    try:
        if workout_type not in ["lunges", "pushups", "squats"]:
            return {"error": "Invalid workout type"}

        # Read the incoming image
        file_content = await file.read()
        if not file_content:
            return {"error": "Empty file received"}
        
        image_bytes = np.frombuffer(file_content, np.uint8)
        frame = cv2.imdecode(image_bytes, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {"error": "Failed to decode image"}

        # Process frame using persistent counter instance (maintains state between frames)
        result = process_frame_with_counter(workout_type, frame)
        
        if not result:
            return {"error": "Processing returned empty result"}

        return result
    except Exception as e:
        import traceback
        print(f"Error processing frame: {str(e)}")
        print(traceback.format_exc())
        return {"error": f"Internal server error: {str(e)}"}


@app.post("/reset-counter")
async def reset_counter(workout_type: str = Form(...)):
    """
    Reset a specific counter's state (useful when starting a new workout session)
    """
    try:
        if workout_type not in exercise_counters:
            return {"error": "Invalid workout type"}
        
        # Recreate the counter instance (resets all state)
        if workout_type == "squats":
            exercise_counters[workout_type] = FinalSquatCounter()
        elif workout_type == "pushups":
            exercise_counters[workout_type] = FinalBalancedPushUpCounter()
        elif workout_type == "lunges":
            exercise_counters[workout_type] = FinalLungeCounter()
        
        return {"status": "Counter reset successfully", "workout_type": workout_type}
    except Exception as e:
        import traceback
        print(f"Error resetting counter: {str(e)}")
        print(traceback.format_exc())
        return {"error": f"Internal server error: {str(e)}"}


# Chatbot request/response models
class ChatbotRequest(BaseModel):
    message: str
    conversation_history: list[dict] = []


@app.post("/chatbot")
async def chatbot(request: ChatbotRequest):
    """
    Chatbot endpoint that supports multiple platforms:
    - Hugging Face Spaces/Inference API
    - OpenAI (if configured)
    - Ollama (local, if configured)
    """
    # Check which platform to use (environment variable or default to HF)
    chatbot_platform = os.getenv("CHATBOT_PLATFORM", "huggingface").lower()
    
    # Try OpenAI first if configured
    if chatbot_platform == "openai":
        try:
            from chatbot_openai import get_openai_response
            response_text = await get_openai_response(
                request.message,
                request.conversation_history
            )
            return {
                "response": response_text,
                "error": None
            }
        except ImportError:
            print("OpenAI not available, falling back to Hugging Face")
        except Exception as e:
            print(f"OpenAI error: {str(e)}, falling back to Hugging Face")
    
    # Try Ollama if configured
    if chatbot_platform == "ollama":
        try:
            from chatbot_ollama import get_ollama_response
            response_text = await get_ollama_response(
                request.message,
                request.conversation_history
            )
            return {
                "response": response_text,
                "error": None
            }
        except ImportError:
            print("Ollama not available, falling back to Hugging Face")
        except Exception as e:
            print(f"Ollama error: {str(e)}, falling back to Hugging Face")
    
    # Default: Hugging Face
    try:
        # Get Hugging Face credentials (from environment or defaults)
        hf_api_url, hf_api_token = get_hf_config()
        
        # Check for placeholder values
        if "your-username" in hf_api_url or "your-model-name" in hf_api_url:
            error_msg = "HF_CHATBOT_API_URL contains placeholder values. Please update the default values in backend/main.py or set environment variables."
            print(f"ERROR: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail=error_msg
            )
        
        if not hf_api_url or not hf_api_token:
            error_msg = "Hugging Face API credentials not configured. Please set HF_CHATBOT_API_URL and HF_CHATBOT_API_TOKEN environment variables or update defaults in backend/main.py"
            print(f"ERROR: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail=error_msg
            )
        
        print(f"Using Hugging Face URL: {hf_api_url}")
        
        # Convert old API URL to new router URL if needed
        if "api-inference.huggingface.co" in hf_api_url:
            # Replace old endpoint with new router endpoint
            hf_api_url = hf_api_url.replace("api-inference.huggingface.co", "router.huggingface.co")
            print(f"Updated API URL to use router: {hf_api_url}")
        
        # Handle Hugging Face Space URLs
        # Spaces use a different API format than models
        is_space_api = False
        if ".hf.space" in hf_api_url:
            # Already a Space API endpoint (e.g., https://owner-space.hf.space/chat or /api)
            is_space_api = True
            print(f"Detected Space API endpoint: {hf_api_url}")
        elif "huggingface.co/spaces/" in hf_api_url:
            # Convert Space URL to Space API endpoint
            is_space_api = True
            space_parts = hf_api_url.split("/spaces/")
            if len(space_parts) > 1:
                space_path = space_parts[1].rstrip("/")
                space_path_parts = space_path.split("/")
                if len(space_path_parts) >= 2:
                    owner = space_path_parts[0]
                    space_name = space_path_parts[1]
                    # Space API endpoint format: https://[owner]-[space-name].hf.space/api
                    hf_api_url = f"https://{owner}-{space_name}.hf.space/api"
                    print(f"Converted Space URL to API endpoint: {hf_api_url}")
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid Space URL format. Expected: https://huggingface.co/spaces/owner/space-name"
                    )
        
        # Build the prompt with conversation history if available
        messages = []
        if request.conversation_history:
            # Add previous messages to context
            for msg in request.conversation_history[-5:]:  # Keep last 5 messages for context
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": request.message
        })
        
        # Prepare the request to Hugging Face
        # Format differs for Space APIs vs Model Inference APIs
        if is_space_api:
            # Space APIs can have different formats depending on the Space
            # Your FastAPI endpoint expects {"question": "..."} format
            payload = {
                "question": request.message  # FastAPI ChatRequest format
            }
            # Some Spaces also accept: {"data": [request.message]} or {"inputs": request.message}
            # We'll try the message format first as it's most common for chat endpoints
            
            # Some Spaces don't require auth, but include it if provided
            headers = {
                "Content-Type": "application/json"
            }
            if hf_api_token:
                headers["Authorization"] = f"Bearer {hf_api_token}"
        else:
            # Standard Inference API format
            payload = {
                "inputs": messages if len(messages) > 1 else request.message,
                "parameters": {
                    "max_new_tokens": 512,
                    "temperature": 0.7,
                    "return_full_text": False
                }
            }
            headers = {
                "Authorization": f"Bearer {hf_api_token}",
                "Content-Type": "application/json"
            }
        
        # Make request to Hugging Face
        async with httpx.AsyncClient(timeout=30.0) as client:
            # For Space APIs, try different payload formats if the first one fails
            response = None
            if is_space_api:
                # Try different payload formats for Space APIs
                # Your FastAPI endpoint expects {"question": "..."} format (ChatRequest schema)
                payload_formats = [
                    {"question": request.message},  # Your FastAPI ChatRequest format (CORRECT)
                    {"message": request.message},   # Alternative format
                    {"text": request.message},     # FastAPI text format
                    {"input": request.message},     # FastAPI input format
                    {"query": request.message},     # FastAPI query format
                    {"data": [request.message]},   # Gradio API format (fallback)
                    {"inputs": [request.message]}, # Alternative Gradio format
                    request.message,               # Direct string (fallback)
                ]
                
                last_error = None
                last_error_detail = None
                for i, payload_format in enumerate(payload_formats):
                    try:
                        if isinstance(payload_format, str):
                            # Direct string - send as text/plain
                            response = await client.post(
                                hf_api_url,
                                content=payload_format,
                                headers={"Content-Type": "text/plain"}
                            )
                        else:
                            response = await client.post(
                                hf_api_url,
                                json=payload_format,
                                headers=headers
                            )
                        
                        if response.status_code in [200, 201]:
                            print(f"✓ Success with payload format {i+1}: {list(payload_format.keys())[0] if isinstance(payload_format, dict) else 'string'}")
                            break  # Success!
                        elif response.status_code in [404, 422]:
                            # Try next format - 422 means wrong format, 404 means wrong endpoint
                            error_text = ""
                            try:
                                error_body = response.json()
                                error_text = json.dumps(error_body, indent=2)
                                # Extract validation errors if present
                                if isinstance(error_body, dict) and "detail" in error_body:
                                    detail = error_body["detail"]
                                    if isinstance(detail, list) and len(detail) > 0:
                                        # FastAPI validation errors show what fields are expected
                                        expected_fields = []
                                        for err in detail:
                                            if "loc" in err and "msg" in err:
                                                field = err["loc"][-1] if err["loc"] else "unknown"
                                                expected_fields.append(f"{field}: {err['msg']}")
                                        if expected_fields:
                                            print(f"⚠ FastAPI validation error - Expected fields: {', '.join(expected_fields)}")
                            except:
                                error_text = response.text[:200]
                            print(f"✗ Format {i+1} failed ({response.status_code}): {error_text[:100]}")
                            last_error = response.status_code
                            last_error_detail = error_text
                            continue
                        else:
                            response.raise_for_status()
                    except httpx.HTTPStatusError as e:
                        last_error = e.response.status_code
                        try:
                            error_body = e.response.json()
                            last_error_detail = str(error_body)
                        except:
                            last_error_detail = e.response.text[:100]
                        
                        if e.response.status_code in [404, 422]:
                            print(f"✗ Format {i+1} failed ({e.response.status_code}): {last_error_detail[:50]}")
                            continue  # Try next format
                        else:
                            # For other errors, still try next format but remember the error
                            print(f"✗ Format {i+1} failed ({e.response.status_code})")
                            continue
                
                if response is None or response.status_code not in [200, 201]:
                    error_msg = f"Space API request failed after trying {len(payload_formats)} formats"
                    error_msg += f"\n\nLast error ({last_error}): {last_error_detail[:200] if last_error_detail else 'Unknown'}"
                    error_msg += "\n\nPlease verify:"
                    error_msg += "\n1. The Space is public and running"
                    error_msg += "\n2. The Space API endpoint is correct"
                    error_msg += "\n3. Check the Space's API documentation for the correct format"
                    error_msg += f"\n4. Space URL: {hf_api_url}"
                    print(f"ERROR: {error_msg}")
                    raise HTTPException(status_code=422, detail=error_msg)
            else:
                # Standard Inference API
                response = await client.post(
                    hf_api_url,
                    json=payload,
                    headers=headers
                )
            
            if response.status_code == 503:
                # Model is loading
                return {
                    "response": "The model is currently loading. Please wait a moment and try again.",
                    "error": "model_loading"
                }
            
            if response.status_code == 404:
                error_msg = f"Model or Space not found at: {hf_api_url}"
                if is_space_api:
                    error_msg += "\n\nFor Spaces, make sure:"
                    error_msg += "\n1. The Space is public and running"
                    error_msg += "\n2. The Space API endpoint is correct"
                    error_msg += "\n3. Or use the model's Inference API URL instead: https://router.huggingface.co/models/owner/model-name"
                else:
                    error_msg += "\n\nPlease verify:"
                    error_msg += "\n1. The model name is correct"
                    error_msg += "\n2. The model exists and supports the Inference API"
                print(f"ERROR: {error_msg}")
                raise HTTPException(status_code=404, detail=error_msg)
            
            response.raise_for_status()
            
            # Handle response - FastAPI can return plain string or JSON
            try:
                # Try to parse as JSON first
                result = response.json()
            except:
                # If it's not JSON, it's a plain string (your FastAPI returns plain string)
                result = response.text
        
        # Parse the response based on model/Space output format
        # Hugging Face models can return different formats:
        # 1. Direct text: {"generated_text": "..."}
        # 2. Array format: [{"generated_text": "..."}]
        # 3. Chat format: {"choices": [{"message": {"content": "..."}}]}
        # 4. Space API format: {"data": ["response"]} or {"output": "response"}
        # 5. Plain string: "response text" (your FastAPI format)
        
        chatbot_response = ""
        
        if is_space_api:
            # Space API response formats (can vary by Space)
            # Your FastAPI returns a plain string, but handle JSON too
            if isinstance(result, str):
                # Plain string response (your FastAPI format)
                chatbot_response = result
            elif isinstance(result, dict):
                # JSON response format
                # Try various common response fields (FastAPI first, then Gradio)
                if "response" in result:
                    chatbot_response = result["response"]
                elif "message" in result:
                    chatbot_response = result["message"]
                elif "output" in result:
                    chatbot_response = result["output"]
                elif "answer" in result:
                    chatbot_response = result["answer"]
                elif "text" in result:
                    chatbot_response = result["text"]
                elif "data" in result:
                    if isinstance(result["data"], list) and len(result["data"]) > 0:
                        chatbot_response = result["data"][0] if isinstance(result["data"][0], str) else str(result["data"][0])
                    elif isinstance(result["data"], str):
                        chatbot_response = result["data"]
                # If it's a dict with a single string value, use that
                elif len(result) == 1:
                    chatbot_response = str(list(result.values())[0])
            elif isinstance(result, list) and len(result) > 0:
                chatbot_response = result[0] if isinstance(result[0], str) else str(result[0])
        else:
            # Standard Inference API formats
            if isinstance(result, list) and len(result) > 0:
                # Array format
                if "generated_text" in result[0]:
                    chatbot_response = result[0]["generated_text"]
                elif "text" in result[0]:
                    chatbot_response = result[0]["text"]
            elif isinstance(result, dict):
                if "generated_text" in result:
                    chatbot_response = result["generated_text"]
                elif "text" in result:
                    chatbot_response = result["text"]
                elif "choices" in result and len(result["choices"]) > 0:
                    # Chat API format
                    chatbot_response = result["choices"][0].get("message", {}).get("content", "")
                elif "output" in result:
                    chatbot_response = result["output"]
        
        # Clean up the response (remove prompt if it was included)
        if chatbot_response.startswith(request.message):
            chatbot_response = chatbot_response[len(request.message):].strip()
        
        if not chatbot_response:
            chatbot_response = "I apologize, but I couldn't generate a response. Please try rephrasing your question."
        
        return {
            "response": chatbot_response.strip(),
            "error": None
        }
        
    except httpx.HTTPStatusError as e:
        error_detail = f"Hugging Face API error: {e.response.status_code}"
        try:
            error_body = e.response.json()
            if isinstance(error_body, dict):
                error_detail = error_body.get("error", error_body.get("message", error_detail))
            else:
                error_detail = str(error_body)
        except:
            try:
                error_text = e.response.text
                if error_text:
                    error_detail = error_text[:200]  # Limit length
            except:
                pass
        print(f"HTTP Error {e.response.status_code}: {error_detail}")
        raise HTTPException(status_code=e.response.status_code, detail=error_detail)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request to Hugging Face API timed out")
    except Exception as e:
        import traceback
        print(f"Error in chatbot endpoint: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
