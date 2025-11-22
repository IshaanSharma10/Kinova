import sys, os, json, cv2, numpy as np

# Add backend root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from counters.pushup_counter import FinalBalancedPushUpCounter

counter = FinalBalancedPushUpCounter()

# Read frame
img_bytes = sys.stdin.buffer.read()
img_array = np.frombuffer(img_bytes, np.uint8)
frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

processed = counter.process_frame(frame)

_, jpeg = cv2.imencode(".jpg", processed)

result = {
    "frame": jpeg.tobytes().hex(),
    "count": counter.counter,
    "stage": counter.stage,
    "avg_speed": counter.avg_speed,
    "good_reps": counter.good_reps,
    "bad_reps": counter.bad_reps,
}

# Print valid JSON only
print(json.dumps(result))
