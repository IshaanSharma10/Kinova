"""
Test script to check your FastAPI Space endpoint format
Run this to see what format your Space expects
"""
import httpx
import json

SPACE_URL = "https://elizaarora22-gait-analyzer-chatbot.hf.space/chat"
TEST_MESSAGE = "Hello"

# Try different formats
formats_to_try = [
    {"message": TEST_MESSAGE},
    {"text": TEST_MESSAGE},
    {"input": TEST_MESSAGE},
    {"query": TEST_MESSAGE},
    {"prompt": TEST_MESSAGE},
]

print(f"Testing FastAPI Space: {SPACE_URL}")
print("=" * 60)

for i, payload in enumerate(formats_to_try, 1):
    try:
        response = httpx.post(
            SPACE_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10.0
        )
        
        print(f"\nFormat {i}: {json.dumps(payload)}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✓ SUCCESS!")
            try:
                result = response.json()
                print(f"Response: {json.dumps(result, indent=2)}")
            except:
                print(f"Response (text): {response.text[:200]}")
            break
        elif response.status_code == 422:
            try:
                error = response.json()
                print(f"✗ 422 Error: {json.dumps(error, indent=2)}")
            except:
                print(f"✗ 422 Error: {response.text[:200]}")
        else:
            print(f"✗ Error: {response.status_code}")
            print(f"Response: {response.text[:200]}")
    except Exception as e:
        print(f"\nFormat {i}: {json.dumps(payload)}")
        print(f"✗ Exception: {str(e)}")

print("\n" + "=" * 60)
print("Check the Space API docs for ChatRequest schema:")
print("https://elizaarora22-gait-analyzer-chatbot.hf.space/docs")

