from fastapi import FastAPI, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import cv2
import numpy as np
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"status": "Backend running!"}


def run_worker(worker_name: str, frame):
    # Encode frame to bytes
    _, img_encoded = cv2.imencode(".jpg", frame)
    img_bytes = img_encoded.tobytes()

    # Run worker Python file
    process = subprocess.Popen(
        ["python", f"workers/{worker_name}.py"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE
    )

    output, _ = process.communicate(input=img_bytes)

    return json.loads(output.decode())


@app.post("/process-frame")
async def process_frame(
    file: UploadFile,
    workout_type: str = Form(...)
):

    if workout_type not in ["lunges", "pushups", "squats"]:
        return {"error": "Invalid workout type"}

    # Read the incoming image
    image_bytes = np.frombuffer(await file.read(), np.uint8)
    frame = cv2.imdecode(image_bytes, cv2.IMREAD_COLOR)

    # Call the worker
    result = run_worker(workout_type, frame)

    return result
