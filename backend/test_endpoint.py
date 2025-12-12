"""
Simple test script to verify the backend endpoint is working
Run this to test the process-frame endpoint without the frontend
"""

import requests
import cv2
import numpy as np
from io import BytesIO

def test_process_frame():
    """Test the /api/process-frame endpoint"""
    
    # Create a test image (simple colored rectangle)
    test_image = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.rectangle(test_image, (100, 100), (540, 380), (0, 255, 0), -1)
    
    # Encode image to JPEG
    _, img_encoded = cv2.imencode('.jpg', test_image)
    img_bytes = img_encoded.tobytes()
    
    # Prepare the request
    # Note: The backend endpoint is /process-frame (no /api prefix)
    # The /api prefix is only for frontend proxy configuration
    url = "http://localhost:8000/process-frame"
    
    files = {
        'file': ('test.jpg', img_bytes, 'image/jpeg')
    }
    
    data = {
        'workout_type': 'squats'  # or 'pushups' or 'lunges'
    }
    
    print("Testing /api/process-frame endpoint...")
    print(f"Sending request to: {url}")
    print(f"Workout type: {data['workout_type']}")
    print(f"Image size: {len(img_bytes)} bytes")
    print()
    
    try:
        response = requests.post(url, files=files, data=data, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ SUCCESS!")
            print()
            print("Response:")
            print(f"  - Count: {result.get('count', 'N/A')}")
            print(f"  - Stage: {result.get('stage', 'N/A')}")
            print(f"  - Good Reps: {result.get('good_reps', 'N/A')}")
            print(f"  - Bad Reps: {result.get('bad_reps', 'N/A')}")
            print(f"  - Avg Speed: {result.get('avg_speed', 'N/A')}")
            print(f"  - Frame returned: {'Yes' if result.get('frame') else 'No'}")
            
            if result.get('frame'):
                print(f"  - Frame length: {len(result['frame'])} characters (hex)")
            
            return True
        else:
            print(f"❌ ERROR: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to backend")
        print("Make sure the backend is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("BACKEND ENDPOINT TEST")
    print("=" * 60)
    print()
    
    # Test all workout types
    workout_types = ['squats', 'pushups', 'lunges']
    
    for workout_type in workout_types:
        print(f"\n{'=' * 60}")
        print(f"Testing: {workout_type.upper()}")
        print('=' * 60)
        
        # Modify the test to use different workout types
        # For now, just test squats
        if workout_type == 'squats':
            test_process_frame()
            break

