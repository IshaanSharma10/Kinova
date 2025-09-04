import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricCard } from '@/components/ui/metric-card';
import { 
  BarChart3, 
  Calendar, 
  Download,
  Target,
  Activity,
  Timer,
  Footprints,
  TrendingUp
} from 'lucide-react';
import { gsap } from 'gsap';

export default function Analytics() {
  const headerRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'SensorViz - Analytics';
    
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }
      );
    }

    if (metricsRef.current) {
      gsap.fromTo(
        metricsRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.3 }
      );
    }

    if (chartsRef.current) {
      gsap.fromTo(
        chartsRef.current,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.5 }
      );
    }
  }, []);

  const analyticsMetrics = [
    {
      title: 'Avg Equilibrium',
      value: '94.7',
      unit: '%',
      status: 'Excellent',
      icon: <Target className="h-5 w-5" />,
      trend: '+12.5%',
      color: 'success' as const
    },
    {
      title: 'Peak Cadence',
      value: '115',
      unit: 'steps/min',
      status: 'High',
      icon: <Timer className="h-5 w-5" />,
      trend: '+8.3%',
      color: 'primary' as const
    },
    {
      title: 'Stride Variance',
      value: '±2.1',
      unit: 'cm',
      status: 'Stable',
      icon: <Footprints className="h-5 w-5" />,
      color: 'warning' as const
    },
    {
      title: 'Data Points',
      value: '1.2M',
      unit: '',
      status: 'Collected',
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'purple' as const
    }
  ];

  const mockChartData = Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    equilibrium: Math.random() * 20 + 80,
    cadence: Math.random() * 30 + 100,
    speed: Math.random() * 0.5 + 1,
    sway: Math.random() * 10 + 5
  }));

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div ref={headerRef} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              Historical gait analysis and movement insights
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Select defaultValue="7days">
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1day">Last 24h</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Calendar className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Custom Range</span>
                <span className="sm:hidden">Range</span>
              </Button>
              <Button size="sm" className="flex-1 sm:flex-none">
                <Download className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Metrics */}
        <div ref={metricsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {analyticsMetrics.map((metric, index) => (
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

        {/* Charts Grid */}
        <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Equilibrium Data Chart */}
          <Card className="bg-gradient-primary border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Equilibrium Data
              </CardTitle>
              <p className="text-sm text-muted-foreground">7-day equilibrium trends</p>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-card/30 rounded-lg border border-border/30 p-4">
                <svg className="w-full h-full">
                  <defs>
                    <linearGradient id="equilibriumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity="0.1"/>
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 0 ${200 - (mockChartData[0].equilibrium - 60) * 3} ${mockChartData.map((d, i) => 
                      `L ${(i / (mockChartData.length - 1)) * 320} ${200 - (d.equilibrium - 60) * 3}`
                    ).join(' ')}`}
                    fill="none"
                    stroke="hsl(var(--success))"
                    strokeWidth="2"
                    className="drop-shadow-sm"
                  />
                  <path
                    d={`M 0 ${200 - (mockChartData[0].equilibrium - 60) * 3} ${mockChartData.map((d, i) => 
                      `L ${(i / (mockChartData.length - 1)) * 320} ${200 - (d.equilibrium - 60) * 3}`
                    ).join(' ')} L 320 200 L 0 200 Z`}
                    fill="url(#equilibriumGradient)"
                  />
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Cadence Data Chart */}
          <Card className="bg-gradient-primary border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Cadence Data
              </CardTitle>
              <p className="text-sm text-muted-foreground">7-day cadence patterns</p>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-card/30 rounded-lg border border-border/30 p-4">
                <svg className="w-full h-full">
                  <defs>
                    <linearGradient id="cadenceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1"/>
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 0 ${200 - (mockChartData[0].cadence - 80) * 2} ${mockChartData.map((d, i) => 
                      `L ${(i / (mockChartData.length - 1)) * 320} ${200 - (d.cadence - 80) * 2}`
                    ).join(' ')}`}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    className="drop-shadow-sm"
                  />
                  <path
                    d={`M 0 ${200 - (mockChartData[0].cadence - 80) * 2} ${mockChartData.map((d, i) => 
                      `L ${(i / (mockChartData.length - 1)) * 320} ${200 - (d.cadence - 80) * 2}`
                    ).join(' ')} L 320 200 L 0 200 Z`}
                    fill="url(#cadenceGradient)"
                  />
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Walking Speed Chart */}
          <Card className="bg-gradient-warning border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Walking Speed
              </CardTitle>
              <p className="text-sm text-muted-foreground">Speed variations over time</p>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-card/30 rounded-lg border border-border/30 p-4">
                <svg className="w-full h-full">
                  <defs>
                    <linearGradient id="speedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity="0.1"/>
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 0 ${200 - mockChartData[0].speed * 100} ${mockChartData.map((d, i) => 
                      `L ${(i / (mockChartData.length - 1)) * 320} ${200 - d.speed * 100}`
                    ).join(' ')}`}
                    fill="none"
                    stroke="hsl(var(--warning))"
                    strokeWidth="2"
                    className="drop-shadow-sm"
                  />
                  <path
                    d={`M 0 ${200 - mockChartData[0].speed * 100} ${mockChartData.map((d, i) => 
                      `L ${(i / (mockChartData.length - 1)) * 320} ${200 - d.speed * 100}`
                    ).join(' ')} L 320 200 L 0 200 Z`}
                    fill="url(#speedGradient)"
                  />
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Postural Sway Chart */}
          <Card className="bg-gradient-purple border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Postural Sway
              </CardTitle>
              <p className="text-sm text-muted-foreground">Balance stability metrics</p>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-card/30 rounded-lg border border-border/30 p-4">
                <svg className="w-full h-full">
                  <defs>
                    <linearGradient id="swayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgb(147 51 234)" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="rgb(147 51 234)" stopOpacity="0.1"/>
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 0 ${200 - mockChartData[0].sway * 10} ${mockChartData.map((d, i) => 
                      `L ${(i / (mockChartData.length - 1)) * 320} ${200 - d.sway * 10}`
                    ).join(' ')}`}
                    fill="none"
                    stroke="rgb(147 51 234)"
                    strokeWidth="2"
                    className="drop-shadow-sm"
                  />
                  <path
                    d={`M 0 ${200 - mockChartData[0].sway * 10} ${mockChartData.map((d, i) => 
                      `L ${(i / (mockChartData.length - 1)) * 320} ${200 - d.sway * 10}`
                    ).join(' ')} L 320 200 L 0 200 Z`}
                    fill="url(#swayGradient)"
                  />
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}