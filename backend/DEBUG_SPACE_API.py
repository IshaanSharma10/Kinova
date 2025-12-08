"""
Debug script to test your FastAPI Space and find the correct format
Run this to see detailed error messages and find what format works
"""
import httpx
import json

SPACE_URL = "https://elizaarora22-gait-analyzer-chatbot.hf.space/chat"
TEST_MESSAGE = "Hello"

print("=" * 70)
print("FastAPI Space API Debugger")
print("=" * 70)
print(f"Testing: {SPACE_URL}")
print(f"Message: {TEST_MESSAGE}")
print("=" * 70)

# Try different formats
formats_to_try = [
    ({"message": TEST_MESSAGE}, "message"),
    ({"text": TEST_MESSAGE}, "text"),
    ({"input": TEST_MESSAGE}, "input"),
    ({"query": TEST_MESSAGE}, "query"),
    ({"prompt": TEST_MESSAGE}, "prompt"),
    ({"user_message": TEST_MESSAGE}, "user_message"),
    ({"user_input": TEST_MESSAGE}, "user_input"),
    ({"question": TEST_MESSAGE}, "question"),
]

success = False

for payload, format_name in formats_to_try:
    try:
        print(f"\n[{format_name}] Trying: {json.dumps(payload)}")
        
        response = httpx.post(
            SPACE_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=15.0
        )
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"  ✓ SUCCESS!")
            try:
                result = response.json()
                print(f"  Response: {json.dumps(result, indent=2)}")
                print("\n" + "=" * 70)
                print(f"✓ CORRECT FORMAT: {{'{format_name}': 'your_message'}}")
                print("=" * 70)
                success = True
                break
            except:
                print(f"  Response (text): {response.text[:200]}")
                success = True
                break
                
        elif response.status_code == 422:
            try:
                error = response.json()
                print(f"  ✗ Validation Error:")
                print(f"  {json.dumps(error, indent=2)}")
                
                # Extract FastAPI validation details
                if isinstance(error, dict) and "detail" in error:
                    detail = error["detail"]
                    if isinstance(detail, list):
                        print(f"\n  Expected fields:")
                        for err in detail:
                            if "loc" in err:
                                field = err["loc"][-1] if err["loc"] else "unknown"
                                msg = err.get("msg", "")
                                print(f"    - {field}: {msg}")
            except:
                print(f"  ✗ Error: {response.text[:200]}")
                
        else:
            print(f"  ✗ Error {response.status_code}: {response.text[:200]}")
            
    except httpx.TimeoutException:
        print(f"  ✗ Timeout")
    except Exception as e:
        print(f"  ✗ Exception: {str(e)}")

if not success:
    print("\n" + "=" * 70)
    print("None of the formats worked.")
    print("\nNext steps:")
    print("1. Check the API docs: https://elizaarora22-gait-analyzer-chatbot.hf.space/docs")
    print("2. Click on 'POST /chat' and expand 'ChatRequest' schema")
    print("3. See what fields it expects")
    print("4. Share the schema fields and I'll update the code")
    print("=" * 70)

