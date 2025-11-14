import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Activity, Wifi, WifiOff } from 'lucide-react';
import { gsap } from 'gsap';

type ExerciseType = 'lunge' | 'pushup' | 'squat';

export default function WorkoutTracker() {
  const [exercise, setExercise] = useState<ExerciseType>('lunge');
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Kinova - Workout Tracker';

    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }
      );
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraError(null);
      }
    } catch (error) {
      setCameraError('Failed to access camera. Please grant camera permissions.');
      console.error('Camera error:', error);
    }
  }, []);

  const captureAndSendFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });

      if (!blob) return;

      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');
      formData.append('exercise', exercise);

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const imageBlob = await response.blob();
        const imageUrl = URL.createObjectURL(imageBlob);
        setProcessedImage((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return imageUrl;
        });
        setIsConnected(true);
        setIsLoading(false);

        // Update FPS
        frameCountRef.current += 1;
        const now = Date.now();
        if (now - lastTimeRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastTimeRef.current = now;
        }
      } else {
        setIsConnected(false);
        console.error('Server error:', response.statusText);
      }
    } catch (error) {
      setIsConnected(false);
      console.error('Frame processing error:', error);
    }
  }, [exercise]);

  useEffect(() => {
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(captureAndSendFrame, 120);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [captureAndSendFrame]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '1') setExercise('lunge');
      else if (e.key === '2') setExercise('pushup');
      else if (e.key === '3') setExercise('squat');
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6" ref={cardRef}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Workout Tracker</h1>
            <p className="text-muted-foreground mt-2">
              Real-time exercise form analysis
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Select value={exercise} onValueChange={(val) => setExercise(val as ExerciseType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select exercise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lunge" disabled className="opacity-50">Lunge (coming soon)</SelectItem>

                <SelectItem value="pushup">Push-up</SelectItem>
                <SelectItem value="squat">Squat</SelectItem>
              </SelectContent>
            </Select>

            <Badge variant={isConnected ? 'default' : 'destructive'} className="gap-2">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  Server Offline
                </>
              )}
            </Badge>

            <Badge variant="outline" className="gap-2">
              <Activity className="w-4 h-4" />
              {fps} FPS
            </Badge>
          </div>
        </div>

        {cameraError && (
          <Card className="bg-destructive/10 border-destructive/50">
            <CardContent className="pt-6">
              <p className="text-destructive font-medium">{cameraError}</p>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Webcam Feed */}
          <Card className="bg-gradient-primary border-border/50 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
                Live Webcam Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-lg overflow-hidden bg-card/30 border border-border/30">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto"
                />
              </div>
            </CardContent>
          </Card>

          {/* Processed Output */}
          <Card className="bg-gradient-primary border-border/50 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Processed Output
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-lg overflow-hidden bg-card/30 border-2 border-success/50">
                {isLoading ? (
                  <div className="aspect-video flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">
                      Loading first frame...
                    </div>
                  </div>
                ) : processedImage ? (
                  <img
                    src={processedImage}
                    alt="Processed frame"
                    className="w-full h-auto transition-opacity duration-200"
                  />
                ) : (
                  <div className="aspect-video flex items-center justify-center">
                    <p className="text-muted-foreground">Waiting for processed frames...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Keyboard Shortcuts */}
        <Card className="bg-gradient-primary border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">
              Keyboard Shortcuts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-muted rounded text-foreground font-mono">1</kbd>
                <span>Lunge</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-muted rounded text-foreground font-mono">2</kbd>
                <span>Push-up</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-muted rounded text-foreground font-mono">3</kbd>
                <span>Squat</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
