import { useEffect, useRef, useState } from "react";

type ExerciseType = "lunge" | "pushup" | "squat";

interface WorkoutCameraProps {
  exercise: ExerciseType;
  onStatsChange?: (stats: WorkoutStats) => void;
}

interface WorkoutStats {
  count: number;
  stage: string | null;
  avg_speed: number;
  good_reps: number;
  bad_reps: number;
}

export default function WorkoutCamera({ exercise, onStatsChange }: WorkoutCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<WorkoutStats>({
    count: 0,
    stage: null,
    avg_speed: 0,
    good_reps: 0,
    bad_reps: 0,
  });

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
      // Use localhost backend
      const response = await fetch('http://localhost:8000/process-frame', {
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
        
        // Clean up previous URL to prevent memory leaks
        if (processedUrl) {
          URL.revokeObjectURL(processedUrl);
        }
        setProcessedUrl(url);
      }
      
      // Update stats from backend response
      if (result.count !== undefined || result.good_reps !== undefined || result.bad_reps !== undefined) {
        const newStats = {
          count: result.count || 0,
          stage: result.stage || null,
          avg_speed: result.avg_speed || 0,
          good_reps: result.good_reps || 0,
          bad_reps: result.bad_reps || 0,
        };
        setStats(newStats);
        // Notify parent component of stats change
        if (onStatsChange) {
          onStatsChange(newStats);
        }
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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", gap: "20px" }}>
        {/* Live Camera View */}
        <div style={{ position: "relative" }}>
          <video
            ref={videoRef}
            autoPlay
            width={640}
            height={480}
            style={{ borderRadius: 12, border: "2px solid #444" }}
          />
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "rgba(0, 0, 0, 0.7)",
              color: "white",
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            Live Camera
          </div>
        </div>

        {/* Hidden canvas for capturing frames */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{ display: "none" }}
        />

        {/* Processed Output */}
        {processedUrl && (
          <div style={{ position: "relative" }}>
            <img
              src={processedUrl}
              width={640}
              height={480}
              alt="Processed frame"
              style={{ borderRadius: 12, border: "2px solid #28a745" }}
            />
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                background: "rgba(40, 167, 69, 0.9)",
                color: "white",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              AI Analysis
            </div>
          </div>
        )}
      </div>

      {/* Stats Display */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          padding: "20px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 12,
          color: "white",
        }}
      >
        {/* Total Count */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.2)",
            padding: "16px",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "4px" }}>
            TOTAL REPS
          </div>
          <div style={{ fontSize: "32px", fontWeight: "bold" }}>
            {stats.count}
          </div>
        </div>

        {/* Good Reps */}
        <div
          style={{
            background: "rgba(40, 167, 69, 0.3)",
            padding: "16px",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "4px" }}>
            ✅ GOOD FORM
          </div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#28a745" }}>
            {stats.good_reps}
          </div>
          {stats.count > 0 && (
            <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>
              {Math.round((stats.good_reps / stats.count) * 100)}% quality
            </div>
          )}
        </div>

        {/* Bad Reps */}
        <div
          style={{
            background: "rgba(255, 193, 7, 0.3)",
            padding: "16px",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "4px" }}>
            ⚠️ NEEDS IMPROVEMENT
          </div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#ffc107" }}>
            {stats.bad_reps}
          </div>
          {stats.count > 0 && (
            <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>
              {Math.round((stats.bad_reps / stats.count) * 100)}% need work
            </div>
          )}
        </div>

        {/* Stage & Speed */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.2)",
            padding: "16px",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "4px" }}>
            STAGE
          </div>
          <div style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>
            {stats.stage || "READY"}
          </div>
          {stats.avg_speed > 0 && (
            <>
              <div style={{ fontSize: "12px", opacity: 0.9, marginTop: "8px" }}>
                AVG SPEED
              </div>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                {stats.avg_speed.toFixed(2)}s
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
