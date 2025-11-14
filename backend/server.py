import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import cv2
import numpy as np

# Import exercise counters
from counters.pushup import FinalBalancedPushUpCounter
from counters.squat import FinalSquatCounter

# Create FastAPI app
app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize only working models
pushup_model = FinalBalancedPushUpCounter()
squat_model = FinalSquatCounter()


@app.post("/process")
async def process_frame(
    file: UploadFile = File(...),
    exercise: str = Form(...)
):
    # Read raw bytes
    content = await file.read()

    # Convert buffer → numpy → frame
    np_arr = np.frombuffer(content, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # Select model
    if exercise == "pushup":
        processed = pushup_model.process_frame(frame)
    elif exercise == "squat":
        processed = squat_model.process_frame(frame)
    else:
        # Lunge disabled
        return {"error": "Lunge model is temporarily disabled"}

    # Convert processed frame back to bytes
    _, buffer = cv2.imencode('.jpg', processed)

    return Response(content=buffer.tobytes(), media_type="image/jpeg")


@app.get("/")
def home():
    return {"status": "Backend is running!"}
