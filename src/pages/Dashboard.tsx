import React, { useEffect, useRef } from 'react';

import Gait3DModel from "@/components/Gait3DModel"
import { Center } from "@react-three/drei";

import { MetricCard } from '@/components/ui/metric-card';
import { LiveIndicator } from '@/components/ui/live-indicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  Activity,
  Zap,
  Timer,
  Target,
  TrendingUp,
  BarChart3,
  Footprints
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

  // CRITICAL DEBUG LOGGING
  useEffect(() => {
    console.log('=== DASHBOARD DEBUG ===');
    console.log('gaitMetricsData:', gaitMetricsData);
    console.log('loading:', loading);
    console.log('error:', error);
    
    if (gaitMetricsData && gaitMetricsData.length > 0) {
      const latest = gaitMetricsData[0];
      console.log('Latest entry full object:', latest);
      console.log('Latest entry JSON:', JSON.stringify(latest, null, 2));
      console.log('Object.keys:', Object.keys(latest));
      console.log('Object.values:', Object.values(latest));
    }
  }, [gaitMetricsData, loading, error]);

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
        <p className="text-xl font-semibold text-destructive">
          Error loading data: {error.message}
        </p>
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
    strideLength: <BarChart3 className="h-5 w-5" />,
    walkingSpeed: <TrendingUp className="h-5 w-5" />,
  };

  // Direct access helper
  const getValue = (obj: any, key: string) => {
    const value = obj[key];
    console.log(`getValue(${key}):`, value, 'type:', typeof value);
    return value;
  };

  // Format helper
  const formatValue = (value: any, decimals: number = 2): string => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }
    if (typeof value === 'number') {
      return value.toFixed(decimals);
    }
    return String(value);
  };

  const formattedGaitMetrics = [
    {
      title: "Steps",
      value: formatValue(getValue(latestGaitEntry, 'steps'), 0),
      unit: "steps",
      status: "LIVE",
      icon: iconMap.stepWidth,
      color: "purple" as const,
    },
    {
      title: "Equilibrium",
      value: formatValue(getValue(latestGaitEntry, 'equilibriumScore'), 4),
      status: "Excellent",
      icon: iconMap.equilibrium,
      color: "success" as const,
    },
    {
      title: "Postural Sway",
      value: formatValue(getValue(latestGaitEntry, 'posturalSway'), 2),
      unit: "mm",
      status: "Normal",
      icon: iconMap.posturalSway,
      color: "primary" as const,
    },
    {
      title: "Cadence",
      value: formatValue(getValue(latestGaitEntry, 'cadence'), 2),
      unit: "steps/min",
      status: "Optimal",
      icon: iconMap.cadence,
      color: "success" as const,
    },
    {
      title: "Frequency",
      value: formatValue(getValue(latestGaitEntry, 'frequency'), 3),
      unit: "Hz",
      status: "Normal",
      icon: iconMap.frequency,
      color: "warning" as const,
    },
    {
      title: "Stride Length",
      value: formatValue(getValue(latestGaitEntry, 'strideLength'), 3),
      unit: "m",
      status: "Good",
      icon: iconMap.strideLength,
      color: "success" as const,
    },
    {
      title: "Walking Speed",
      value: formatValue(getValue(latestGaitEntry, 'walkingSpeed'), 4),
      unit: "m/s",
      status: "Average",
      icon: iconMap.walkingSpeed,
      color: "warning" as const,
    },
    {
      title: "Step Width",
      value: formatValue(getValue(latestGaitEntry, 'stepWidth'), 3),
      unit: "m",
      status: "Balanced",
      icon: iconMap.stepWidth,
      color: "purple" as const,
    },
  ];

  console.log('formattedGaitMetrics:', formattedGaitMetrics);

  const formattedSensorData = [
    {
      label: "Equilibrium",
      value: formatValue(getValue(latestGaitEntry, 'equilibriumScore'), 4),
      status: "LIVE",
      color: "success" as const,
    },
    {
      label: "Cadence",
      value: `${formatValue(getValue(latestGaitEntry, 'cadence'), 2)} steps/min`,
      status: "LIVE",
      color: "primary" as const,
    },
    {
      label: "Walking Speed",
      value: `${formatValue(getValue(latestGaitEntry, 'walkingSpeed'), 4)} m/s`,
      status: "LIVE",
      color: "warning" as const,
    },
    {
      label: "Postural Sway",
      value: `${formatValue(getValue(latestGaitEntry, 'posturalSway'), 2)} mm`,
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