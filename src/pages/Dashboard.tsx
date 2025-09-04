import React, { useEffect, useRef } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { LiveIndicator } from '@/components/ui/live-indicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Activity, 
  Zap, 
  Thermometer, 
  Timer,
  Target,
  TrendingUp,
  BarChart3,
  Footprints
} from 'lucide-react';
import { gsap } from 'gsap';

export default function Dashboard() {
  const headerRef = useRef<HTMLDivElement>(null);
  const modelViewerRef = useRef<HTMLDivElement>(null);
  const sensorDataRef = useRef<HTMLDivElement>(null);

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

  const gaitMetrics = [
    {
      title: 'Equilibrium',
      value: '95.2',
      unit: '%',
      status: 'Excellent',
      icon: <Target className="h-5 w-5" />,
      trend: '+2.3%',
      color: 'success' as const
    },
    {
      title: 'Postural Sway',
      value: '12.4',
      unit: 'mm',
      status: 'Normal',
      icon: <Activity className="h-5 w-5" />,
      trend: '-5.1%',
      color: 'primary' as const
    },
    {
      title: 'Cadence',
      value: '108',
      unit: 'steps/min',
      status: 'Optimal',
      icon: <Timer className="h-5 w-5" />,
      trend: '+1.8%',
      color: 'success' as const
    },
    {
      title: 'Frequency',
      value: '1.8',
      unit: 'Hz',
      status: 'Normal',
      icon: <Zap className="h-5 w-5" />,
      color: 'warning' as const
    },
    {
      title: 'Step Width',
      value: '14.2',
      unit: 'cm',
      status: 'Stable',
      icon: <Footprints className="h-5 w-5" />,
      trend: '+0.5%',
      color: 'primary' as const
    },
    {
      title: 'Stride Length',
      value: '68.5',
      unit: 'cm',
      status: 'Good',
      icon: <BarChart3 className="h-5 w-5" />,
      trend: '+2.1%',
      color: 'success' as const
    },
    {
      title: 'Walking Speed',
      value: '1.24',
      unit: 'm/s',
      status: 'Average',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'warning' as const
    },
    {
      title: 'Phase Mean',
      value: '62.3',
      unit: '%',
      status: 'Balanced',
      icon: <Activity className="h-5 w-5" />,
      trend: '-1.2%',
      color: 'purple' as const
    }
  ];

  const sensorData = [
    { label: 'Equilibrium', value: '2.4 m/s²', status: 'LIVE', color: 'success' },
    { label: 'Cadence', value: '108 steps', status: 'LIVE', color: 'primary' },
    { label: 'Walking Speed', value: '1.24 m/s', status: 'LIVE', color: 'warning' },
    { label: 'Postural Sway', value: '12.4 mm', status: 'LIVE', color: 'purple' }
  ];

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div ref={headerRef} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Kinova Dashboard</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              Real-time gait analysis and movement tracking
            </p>
          </div>
          <LiveIndicator size="lg" className="self-start sm:self-auto" />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {gaitMetrics.map((metric, index) => (
            <MetricCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              unit={metric.unit}
              status={metric.status}
              icon={metric.icon}
              trend={metric.trend}
              color={metric.color}
              delay={index * 100}
            />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* 3D Model Viewer */}
          <div className="lg:col-span-2">
            <Card ref={modelViewerRef} className="bg-gradient-primary border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    3D Gait Model
                  </CardTitle>
                  <LiveIndicator />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-80 lg:h-96 bg-card/30 rounded-lg border border-border/30 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Activity className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">3D Gait Model Viewer</h3>
                    <p className="text-muted-foreground">
                      Real-time 3D visualization of patient movement patterns
                    </p>
                    <p className="text-sm text-primary">
                      Three.js integration ready for GLTF/GLB gait models
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sensor Data Stream */}
          <Card ref={sensorDataRef} className="bg-gradient-primary border-border/50">
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
              {sensorData.map((sensor, index) => (
                <div key={sensor.label} className="flex items-center justify-between p-3 bg-card/30 rounded-lg border border-border/30">
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground text-sm">{sensor.label}</p>
                      <p className="text-xs text-muted-foreground">{sensor.value}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-${sensor.color} shadow-glow-${sensor.color}`} />
                    <span className="text-xs text-success font-medium">{sensor.status}</span>
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