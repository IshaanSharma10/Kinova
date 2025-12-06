import React, { useEffect, useRef } from 'react';

import Gait3DModel from "@/components/Gait3DModel"
import { MetricCard } from '@/components/ui/metric-card';
import { LiveIndicator } from '@/components/ui/live-indicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  Activity,
  Zap,
  Timer,
  Target,
  TrendingUp,
  Footprints,
  Weight,
} from 'lucide-react';

import { gsap } from 'gsap';
import { useGaitMetrics } from '@/hooks/useGaitMetrics';

export default function Dashboard() {
  const headerRef = useRef<HTMLDivElement>(null);
  const modelViewerRef = useRef<HTMLDivElement>(null);
  const sensorDataRef = useRef<HTMLDivElement>(null);

  const { data: gaitMetricsData, loading, error } = useGaitMetrics();

  useEffect(() => {
    document.title = 'Kinova Dashboard';

    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }
      );
    }

    if (modelViewerRef.current) {
      gsap.fromTo(
        modelViewerRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1, ease: 'power2.out', delay: 0.5 }
      );
    }

    if (sensorDataRef.current) {
      gsap.fromTo(
        sensorDataRef.current,
        { x: 50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.3 }
      );
    }
  }, []);

  // Log whenever data changes
  useEffect(() => {
    if (gaitMetricsData && gaitMetricsData.length > 0) {
      console.log('Latest gait entry:', gaitMetricsData[0]._key);
    }
  }, [gaitMetricsData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl font-semibold text-foreground animate-pulse">
          Loading real-time gait data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl font-semibold text-destructive">
            Error loading data: {error.message}
          </p>
          <p className="text-sm text-muted-foreground">
            Check console for details
          </p>
        </div>
      </div>
    );
  }

  if (!gaitMetricsData || gaitMetricsData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl font-semibold text-muted-foreground">
          No gait data available. Waiting for sensor data...
        </p>
      </div>
    );
  }

  const latestGaitEntry = gaitMetricsData[0];

  const iconMap: { [key: string]: JSX.Element } = {
    equilibrium: <Target className="h-5 w-5" />,
    posturalSway: <Activity className="h-5 w-5" />,
    cadence: <Timer className="h-5 w-5" />,
    frequency: <Zap className="h-5 w-5" />,
    stepWidth: <Footprints className="h-5 w-5" />,
    kneeForce: <Weight className="h-5 w-5" />,
    walkingSpeed: <TrendingUp className="h-5 w-5" />,
  };

  // Format with proper null checking
  const formatValue = (value: number | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'number' && !isNaN(value)) {
      return value.toFixed(decimals);
    }
    return 'N/A';
  };

  const formattedGaitMetrics = [
    {
      title: "Steps",
      value: formatValue(latestGaitEntry.steps, 0),
      unit: "steps",
      
      icon: iconMap.stepWidth,
      color: "purple" as const,
    },
    {
      title: "Equilibrium",
      value: formatValue(latestGaitEntry.equilibriumScore, 6),
      
      icon: iconMap.equilibrium,
      color: "success" as const,
    },
    {
      title: "Postural Sway",
      value: formatValue(latestGaitEntry.posturalSway, 6),
      unit: "deg",
      
      icon: iconMap.posturalSway,
      color: "primary" as const,
    },
    {
      title: "Cadence",
      value: formatValue(latestGaitEntry.cadence, 5),
      unit: "steps/min",
     
      icon: iconMap.cadence,
      color: "success" as const,
    },
    {
      title: "Frequency",
      value: formatValue(latestGaitEntry.frequency, 6),
      unit: "Hz",
      
      icon: iconMap.frequency,
      color: "warning" as const,
    },
    {
      title: "Knee Force",
      value: formatValue(latestGaitEntry.kneeForce, 6),
      unit: "N",
     
      icon: iconMap.kneeForce,
      color: "success" as const,
    },
    {
      title: "Walking Speed",
      value: formatValue(latestGaitEntry.walkingSpeed, 6),
      unit: "m/s",
      
      icon: iconMap.walkingSpeed,
      color: "warning" as const,
    },
    {
      title: "Step Width",
      value: formatValue(latestGaitEntry.stepWidth, 6),
      unit: "m",
     
      icon: iconMap.stepWidth,
      color: "purple" as const,
    },
  ];

  const formattedSensorData = [
    {
      label: "Equilibrium",
      value: formatValue(latestGaitEntry.equilibriumScore, 6),
      status: "LIVE",
      color: "success" as const,
    },
    {
      label: "Cadence",
      value: `${formatValue(latestGaitEntry.cadence, 5)} steps/min`,
      status: "LIVE",
      color: "primary" as const,
    },
    {
      label: "Walking Speed",
      value: `${formatValue(latestGaitEntry.walkingSpeed, 6)} m/s`,
      status: "LIVE",
      color: "warning" as const,
    },
    {
      label: "Postural Sway",
      value: `${formatValue(latestGaitEntry.posturalSway, 6)} mm`,
      status: "LIVE",
      color: "purple" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div
          ref={headerRef}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              Real-time gait analysis and movement tracking
            </p>
          </div>
          <LiveIndicator size="lg" className="self-start sm:self-auto" />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {formattedGaitMetrics.map((metric, index) => (
            <MetricCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              unit={metric.unit}
              status={metric.status}
              icon={metric.icon}
              color={metric.color}
              delay={index * 100}
            />
          ))}
        </div>

        {/* Model + Sensor Data */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* 3D Model Viewer */}
          <div className="lg:col-span-2">
            <Card
              ref={modelViewerRef}
              className="bg-gradient-primary border-border/50"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    3D Gait Model
                  </CardTitle>
                  <LiveIndicator />
                </div>
              </CardHeader>

              <CardContent className="h-[500px]">
                <div className="rounded-lg overflow-hidden border border-border/30 w-full h-full">
                  <Gait3DModel />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sensor Data */}
          <Card
            ref={sensorDataRef}
            className="bg-gradient-primary border-border/50"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Sensor Data
                </CardTitle>
                <div className="text-xs px-2 py-1 bg-success/20 text-success rounded-full font-medium">
                  STREAMING
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {formattedSensorData.map((sensor) => (
                <div
                  key={sensor.label}
                  className="flex items-center justify-between p-3 bg-card/30 rounded-lg border border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {sensor.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sensor.value}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full bg-${sensor.color} shadow-glow-${sensor.color}`}
                    />
                    <span className="text-xs text-success font-medium">
                      {sensor.status}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}