import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, StopCircle, Play, RotateCcw, Activity, Target, Timer, TrendingUp } from 'lucide-react';
import { gsap } from 'gsap';

// Workout types
type WorkoutType = 'squats' | 'pushups' | 'lunges';

interface WorkoutStats {
  count: number;
  stage: 'UP' | 'DOWN' | null;
  avgAngle: number;
  avgSpeed: number;
  goodReps: number;
  badReps: number;
  isReady: boolean;
  feedback: string;
}

export default function WorkoutTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();
  const repStartTimeRef = useRef<number | null>(null);
  const lastRepTimeRef = useRef<number>(0);
  const speedsRef = useRef<number[]>([]);
  const consecutiveUpFramesRef = useRef<number>(0);
  const consecutiveDownFramesRef = useRef<number>(0);
  const stableFrameCountRef = useRef<number>(0);
  const angleBufferRef = useRef<number[]>([]);
  
  const [isTracking, setIsTracking] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutType>('squats');
  const [stats, setStats] = useState<WorkoutStats>({
    count: 0,
    stage: null,
    avgAngle: 0,
    avgSpeed: 0,
    goodReps: 0,
    badReps: 0,
    isReady: false,
    feedback: 'Position yourself in front of the camera'
  });

  // Send frame to backend for counting (while MediaPipe handles visualization)
  const sendFrameToBackend = async () => {
    if (!videoRef.current || !canvasRef.current || !isTracking) return;

    try {
      // Capture frame to canvas
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Convert to blob
      const blob: Blob | null = await new Promise((resolve) =>
        canvasRef.current!.toBlob(resolve, 'image/jpeg')
      );
      
      if (!blob) return;

      // Prepare workout type for backend
      const workoutTypeMap: Record<WorkoutType, string> = {
        squats: 'squats',
        pushups: 'pushups',
        lunges: 'lunges'
      };

      // Send to backend
      const form = new FormData();
      form.append('file', blob, 'frame.jpg');
      form.append('workout_type', workoutTypeMap[selectedWorkout]);

      // Use localhost backend
      const response = await fetch('http://localhost:8000/process-frame', {
        method: 'POST',
        body: form,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update stats from backend (backend handles all counting logic)
        if (result.count !== undefined || result.good_reps !== undefined) {
          setStats(prev => ({
            ...prev,
            count: result.count || 0,
            stage: result.stage as 'UP' | 'DOWN' | null,
            avgSpeed: result.avg_speed || 0,
            goodReps: result.good_reps || 0,
            badReps: result.bad_reps || 0,
            isReady: result.stage !== null,
            feedback: result.stage === 'UP' ? 'Ready - Start your rep' : 
                     result.stage === 'DOWN' ? 'Going down...' : 
                     'Position yourself in front of the camera'
          }));
        }
      }
    } catch (err) {
      // Silently fail - don't interrupt MediaPipe visualization
      console.error('Backend frame processing error:', err);
    }
  };
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Workout configurations
  const workoutConfig = {
    squats: {
      name: 'Squats',
      angleThresholdUp: 155,
      angleThresholdDown: 115,
      stableFramesRequired: 18,
      consecutiveFramesRequired: 2,
      qualityDepthThreshold: 100,
    },
    pushups: {
      name: 'Push-ups',
      angleThresholdUp: 155,
      angleThresholdDown: 110,
      stableFramesRequired: 30,
      consecutiveFramesRequired: 3,
      qualityDepthThreshold: 95,
    },
    lunges: {
      name: 'Lunges',
      angleThresholdUp: 155,
      angleThresholdDown: 135,
      stableFramesRequired: 18,
      consecutiveFramesRequired: 2,
      qualityDepthThreshold: 105,
    },
  };

  const config = workoutConfig[selectedWorkout];

  // Calculate angle between three points
  const calculateAngle = (a: number[], b: number[], c: number[]): number => {
    const radians = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(a[1] - b[1], a[0] - b[0]);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  };

  // Smooth angle values
  const smoothAngle = (newAngle: number): number => {
    angleBufferRef.current.push(newAngle);
    if (angleBufferRef.current.length > 8) {
      angleBufferRef.current.shift();
    }
    return angleBufferRef.current.reduce((a, b) => a + b, 0) / angleBufferRef.current.length;
  };

  // Process pose landmarks (MediaPipe visualization only - counting done by backend)
  const processPose = (results: any) => {
    if (!results.poseLandmarks || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save current video frame first (for backend)
    if (videoRef.current) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Draw landmarks overlay
    const landmarks = results.poseLandmarks;
    
    // Draw connections
    ctx.strokeStyle = '#F57542';
    ctx.lineWidth = 2;
    
    const connections = [
      [11, 13], [13, 15], // Left arm
      [12, 14], [14, 16], // Right arm  
      [11, 23], [12, 24], // Torso
      [23, 25], [25, 27], // Left leg
      [24, 26], [26, 28], // Right leg
    ];

    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
      ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
      ctx.stroke();
    });

    // Draw landmarks
    landmarks.forEach((landmark: any) => {
      ctx.fillStyle = '#79164C';
      ctx.beginPath();
      ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Calculate angles based on workout type
    let avgAngle = 0;
    const w = canvas.width;
    const h = canvas.height;

    if (selectedWorkout === 'squats') {
      // Calculate knee angles for squats
      const leftHip = [landmarks[23].x * w, landmarks[23].y * h];
      const leftKnee = [landmarks[25].x * w, landmarks[25].y * h];
      const leftAnkle = [landmarks[27].x * w, landmarks[27].y * h];
      const rightHip = [landmarks[24].x * w, landmarks[24].y * h];
      const rightKnee = [landmarks[26].x * w, landmarks[26].y * h];
      const rightAnkle = [landmarks[28].x * w, landmarks[28].y * h];

      const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
      const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
      avgAngle = (leftKneeAngle + rightKneeAngle) / 2;
      
      // Display angles
      ctx.fillStyle = '#FFFF00';
      ctx.font = '14px Arial';
      ctx.fillText(`${Math.round(leftKneeAngle)}°`, leftKnee[0] + 10, leftKnee[1]);
      ctx.fillText(`${Math.round(rightKneeAngle)}°`, rightKnee[0] - 40, rightKnee[1]);
    } 
    else if (selectedWorkout === 'pushups') {
      // Calculate elbow angles for pushups
      const leftShoulder = [landmarks[11].x * w, landmarks[11].y * h];
      const leftElbow = [landmarks[13].x * w, landmarks[13].y * h];
      const leftWrist = [landmarks[15].x * w, landmarks[15].y * h];
      const rightShoulder = [landmarks[12].x * w, landmarks[12].y * h];
      const rightElbow = [landmarks[14].x * w, landmarks[14].y * h];
      const rightWrist = [landmarks[16].x * w, landmarks[16].y * h];

      const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
      const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
      avgAngle = (leftElbowAngle + rightElbowAngle) / 2;
      
      ctx.fillStyle = '#FFFF00';
      ctx.font = '14px Arial';
      ctx.fillText(`${Math.round(leftElbowAngle)}°`, leftElbow[0] + 10, leftElbow[1]);
      ctx.fillText(`${Math.round(rightElbowAngle)}°`, rightElbow[0] - 40, rightElbow[1]);
    }
    else if (selectedWorkout === 'lunges') {
      // Calculate knee angles for lunges
      const leftHip = [landmarks[23].x * w, landmarks[23].y * h];
      const leftKnee = [landmarks[25].x * w, landmarks[25].y * h];
      const leftAnkle = [landmarks[27].x * w, landmarks[27].y * h];
      const rightHip = [landmarks[24].x * w, landmarks[24].y * h];
      const rightKnee = [landmarks[26].x * w, landmarks[26].y * h];
      const rightAnkle = [landmarks[28].x * w, landmarks[28].y * h];

      const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
      const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
      avgAngle = Math.min(leftKneeAngle, rightKneeAngle); // Use front leg
      
      ctx.fillStyle = '#FFFF00';
      ctx.font = '14px Arial';
      ctx.fillText(`${Math.round(leftKneeAngle)}°`, leftKnee[0] + 10, leftKnee[1]);
      ctx.fillText(`${Math.round(rightKneeAngle)}°`, rightKnee[0] - 40, rightKnee[1]);
    }

    // Display angle for visualization (counting is done by backend)
    const smoothedAngle = smoothAngle(avgAngle);
    
    // Update angle in stats for display (but don't do counting logic here)
    setStats(prev => ({ ...prev, avgAngle: smoothedAngle }));
  };

  // Reset function
  const resetWorkout = () => {
    // Reset stats
    setStats({
      count: 0,
      stage: null,
      avgAngle: 0,
      avgSpeed: 0,
      goodReps: 0,
      badReps: 0,
      isReady: false,
      feedback: 'Position yourself in front of the camera'
    });
    
    // Reset tracking refs
    stableFrameCountRef.current = 0;
    consecutiveUpFramesRef.current = 0;
    consecutiveDownFramesRef.current = 0;
    repStartTimeRef.current = null;
    lastRepTimeRef.current = 0;
    speedsRef.current = [];
    angleBufferRef.current = [];
    
    // Store whether tracking was active before reset
    const wasTracking = isTracking;
    
    // Stop camera first (this stops MediaPipe processing)
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
        cameraRef.current = null;
      } catch (error) {
        console.warn('Error stopping camera:', error);
      }
    }
    
    // Cancel any pending animation frames
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    
    // Reset MediaPipe Pose instance
    // MediaPipe Pose doesn't have a close method, so we nullify it
    // It will be recreated when startTracking is called again
    poseRef.current = null;
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    
    // Reset tracking state
    setIsTracking(false);
    
    // Reset backend counter
    const workoutTypeMap: Record<WorkoutType, string> = {
      squats: 'squats',
      pushups: 'pushups',
      lunges: 'lunges'
    };
    
    fetch('http://localhost:8000/reset-counter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `workout_type=${workoutTypeMap[selectedWorkout]}`
    }).catch(console.error);
    
    // Reinitialize MediaPipe if it was tracking before reset
    if (wasTracking && videoRef.current && videoRef.current.srcObject) {
      // Small delay to ensure cleanup is complete, then reinitialize
      setTimeout(() => {
        startTracking().catch(console.error);
      }, 200);
    }
  };

  // Start camera and pose detection
  const startTracking = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Load MediaPipe Pose from CDN
      const Pose = (window as any).Pose;
      const Camera = (window as any).Camera;
      
      if (!Pose || !Camera) {
        throw new Error('MediaPipe not loaded. Please refresh the page.');
      }

      // Initialize pose detection
      poseRef.current = new Pose({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });

      poseRef.current.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.65
      });

      poseRef.current.onResults(processPose);

      // Start camera
      if (videoRef.current) {
        let frameCount = 0;
        cameraRef.current = new Camera(videoRef.current, {
          onFrame: async () => {
            if (poseRef.current && videoRef.current) {
              await poseRef.current.send({ image: videoRef.current });
              
              // Send frame to backend every 4 frames (~8 FPS to backend)
              frameCount++;
              if (frameCount % 4 === 0) {
                sendFrameToBackend();
              }
            }
          },
          width: 640,
          height: 480
        });

        await cameraRef.current.start();
        setIsTracking(true);
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start camera');
      setIsLoading(false);
      console.error('Error starting tracking:', err);
    }
  };

  // Stop tracking
  const stopTracking = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
    }
    setIsTracking(false);
  };

  // Load MediaPipe scripts
  useEffect(() => {
    const script1 = document.createElement('script');
    script1.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
    script1.crossOrigin = 'anonymous';
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js';
    script2.crossOrigin = 'anonymous';
    document.body.appendChild(script2);

    const script3 = document.createElement('script');
    script3.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js';
    script3.crossOrigin = 'anonymous';
    document.body.appendChild(script3);

    const script4 = document.createElement('script');
    script4.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
    script4.crossOrigin = 'anonymous';
    document.body.appendChild(script4);

    return () => {
      document.body.removeChild(script1);
      document.body.removeChild(script2);
      document.body.removeChild(script3);
      document.body.removeChild(script4);
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, []);

  // Resize canvas
  useEffect(() => {
    if (canvasRef.current && videoRef.current) {
      canvasRef.current.width = 640;
      canvasRef.current.height = 480;
    }
  }, []);

  const workoutInfo = {
    squats: { color: 'bg-blue-500', icon: <Target className="w-5 h-5" /> },
    pushups: { color: 'bg-green-500', icon: <Activity className="w-5 h-5" /> },
    lunges: { color: 'bg-purple-500', icon: <TrendingUp className="w-5 h-5" /> }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Workout Tracker</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              AI-powered exercise form tracking with MediaPipe + Backend counting
            </p>
          </div>
          <div className="flex items-center gap-2">
            {workoutInfo[selectedWorkout].icon}
            <span className="text-sm font-medium text-foreground">{config.name}</span>
          </div>
        </div>

        {error && (
          <Card className="bg-destructive/10 border-destructive/50">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-gradient-primary border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Camera Feed
                  </CardTitle>
                  <Select 
                    value={selectedWorkout} 
                    onValueChange={(value) => {
                      setSelectedWorkout(value as WorkoutType);
                      resetWorkout();
                    }}
                    disabled={isTracking}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="squats">Squats</SelectItem>
                      <SelectItem value="pushups">Push-ups</SelectItem>
                      <SelectItem value="lunges">Lunges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full transform scale-x-[-1] pointer-events-none"
                  />
                  
                  {!isTracking && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center">
                        <Camera className="w-16 h-16 text-white mx-auto mb-4" />
                        <p className="text-white">Click Start to begin</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  {!isTracking ? (
                    <Button onClick={startTracking} className="flex-1" disabled={isLoading}>
                      <Play className="w-4 h-4 mr-2" />
                      {isLoading ? 'Loading...' : 'Start Tracking'}
                    </Button>
                  ) : (
                    <Button onClick={stopTracking} variant="destructive" className="flex-1">
                      <StopCircle className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  )}
                  <Button onClick={resetWorkout} variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="bg-gradient-primary border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-5xl font-bold text-primary">{stats.count}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Reps</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-success/10 rounded-lg">
                    <div className="text-2xl font-bold text-success">{stats.goodReps}</div>
                    <div className="text-xs text-muted-foreground">Good Form</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {stats.count > 0 ? `${Math.round((stats.goodReps / stats.count) * 100)}%` : '0%'}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-warning/10 rounded-lg">
                    <div className="text-2xl font-bold text-warning">{stats.badReps}</div>
                    <div className="text-xs text-muted-foreground">Needs Work</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {stats.count > 0 ? `${Math.round((stats.badReps / stats.count) * 100)}%` : '0%'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stage:</span>
                    <span className="font-medium text-foreground">{stats.stage || 'N/A'}</span>
                  </div>
                  {stats.avgSpeed > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg Speed:</span>
                      <span className="font-medium text-foreground">{stats.avgSpeed.toFixed(2)}s</span>
                    </div>
                  )}
                  {stats.avgAngle > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Angle:</span>
                      <span className="font-medium text-foreground">{Math.round(stats.avgAngle)}°</span>
                    </div>
                  )}
                </div>

                <div className={`p-3 rounded-lg text-center ${
                  stats.isReady ? 'bg-success/20' : 'bg-warning/20'
                }`}>
                  <div className={`text-sm font-medium ${
                    stats.isReady ? 'text-success' : 'text-warning'
                  }`}>
                    {stats.feedback}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-primary border-border/50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-foreground">Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• Ensure good lighting</li>
                  <li>• Keep full body in frame</li>
                  <li>• Maintain proper form</li>
                  <li>• Move at a steady pace</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}