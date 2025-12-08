import { useEffect, useRef, useState } from "react";

type ExerciseType = "lunge" | "pushup" | "squat";

interface WorkoutCameraProps {
  exercise: ExerciseType;
}

export default function WorkoutCamera({ exercise }: WorkoutCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  /** Initialize Webcam */
  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
      }
    }

    initCamera();
  }, []);

  /** Send frame to backend API */
  const sendFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw frame on canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas → blob
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg")
    );

    if (!blob) return;

    // Prepare payload - match backend endpoint format
    const form = new FormData();
    form.append("file", blob, "frame.jpg");
    // Backend expects "workout_type" not "exercise", and needs plural form
    const workoutTypeMap: Record<ExerciseType, string> = {
      lunge: "lunges",
      pushup: "pushups",
      squat: "squats"
    };
    form.append("workout_type", workoutTypeMap[exercise]);

    try {
      const response = await fetch("/api/process-frame", {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      // Backend returns JSON with hex-encoded frame, not image blob
      const result = await response.json();
      
      // Convert hex string back to image
      if (result.frame) {
        const hexString = result.frame;
        const bytes = new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        const imageBlob = new Blob([bytes], { type: 'image/jpeg' });
        const url = URL.createObjectURL(imageBlob);
        setProcessedUrl(url);
      }
    } catch (err) {
      console.error("Error sending frame:", err);
    }
  };

  /** Auto-send frames at intervals */
  useEffect(() => {
    const interval = setInterval(sendFrame, 120); // ~8 FPS
    return () => clearInterval(interval);
  }, [exercise]);

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      {/* Live Camera View */}
      <video
        ref={videoRef}
        autoPlay
        width={640}
        height={480}
        style={{ borderRadius: 12, border: "2px solid #444" }}
      />

      {/* Hidden canvas for capturing frames */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ display: "none" }}
      />

      {/* Processed Output */}
      {processedUrl && (
        <img
          src={processedUrl}
          width={640}
          height={480}
          alt="Processed frame"
          style={{ borderRadius: 12, border: "2px solid #28a745" }}
        />
      )}
    </div>
  );
}
