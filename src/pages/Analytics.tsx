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
  TrendingUp,
  Zap,
} from 'lucide-react';
import { gsap } from 'gsap';
import { useGaitMetrics } from '@/hooks/useGaitMetrics';

// Import Recharts components
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Analytics() {
  const headerRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<HTMLDivElement>(null);

  const { data: gaitData, loading, error } = useGaitMetrics();

  useEffect(() => {
    document.title = 'Kinova - Analytics';
    
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' });
    }
    if (metricsRef.current) {
      gsap.fromTo(metricsRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.3 });
    }
    if (chartsRef.current) {
      gsap.fromTo(chartsRef.current, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.5 });
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl font-semibold text-foreground animate-pulse">
          Fetching historical analytics data...
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

  // Filter out any invalid entries (like 'average_scores') before processing
  const validGaitData = gaitData 
    ? gaitData.filter(entry => 
        entry && 
        entry._key && 
        entry._key.startsWith('-') && // Only Firebase push IDs
        typeof entry.equilibriumScore === 'number' && 
        typeof entry.cadence === 'number' &&
        typeof entry.strideLength === 'number' &&
        typeof entry.walkingSpeed === 'number' &&
        typeof entry.posturalSway === 'number'
      ) 
    : [];

  if (validGaitData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl font-semibold text-muted-foreground">
          No valid historical data available to display.
        </p>
      </div>
    );
  }

  // Calculate dynamic metrics from ALL the filtered data
  const totalEquilibrium = validGaitData.reduce((sum, entry) => sum + entry.equilibriumScore, 0);
  const avgEquilibrium = totalEquilibrium / validGaitData.length;
  
  const peakCadence = validGaitData.reduce((max, entry) => Math.max(max, entry.cadence), 0);
  
  const totalStrideLength = validGaitData.reduce((sum, entry) => sum + entry.strideLength, 0);
  const avgStrideLength = totalStrideLength / validGaitData.length;
  
  const variance = validGaitData.reduce((sum, entry) => 
    sum + Math.pow(entry.strideLength - avgStrideLength, 2), 0
  ) / validGaitData.length;
  const strideVariance = Math.sqrt(variance) * 100; // Convert to cm

  const totalWalkingSpeed = validGaitData.reduce((sum, entry) => sum + entry.walkingSpeed, 0);
  const avgWalkingSpeed = totalWalkingSpeed / validGaitData.length;

  const totalSteps = validGaitData.reduce((sum, entry) => sum + (entry.steps || 0), 0);
  
  const totalFrequency = validGaitData.reduce((sum, entry) => sum + (entry.frequency || 0), 0);
  const avgFrequency = totalFrequency / validGaitData.length;

  // Helper function to format a value - matches Dashboard formatting
  const formatValue = (value: any, decimals: number = 2): string => {
    if (value === null || value === undefined || value === '' || isNaN(value)) {
      return 'N/A';
    }
    if (typeof value === 'number') {
      return value.toFixed(decimals);
    }
    return String(value);
  };

  const analyticsMetrics = [
    {
      title: 'Avg Equilibrium',
      value: formatValue(avgEquilibrium, 4),
      unit: '',
      status: avgEquilibrium > 0.5 ? 'Excellent' : 'Good',
      icon: <Target className="h-5 w-5" />,
      color: 'success' as const
    },
    {
      title: 'Peak Cadence',
      value: formatValue(peakCadence, 2),
      unit: 'steps/min',
      status: 'High',
      icon: <Timer className="h-5 w-5" />,
      color: 'primary' as const
    },
    {
      title: 'Stride Variance',
      value: `±${formatValue(strideVariance, 2)}`,
      unit: 'cm',
      status: strideVariance < 3 ? 'Stable' : 'Variable',
      icon: <Footprints className="h-5 w-5" />,
      color: 'warning' as const
    },
    {
      title: 'Data Points',
      value: validGaitData.length.toString(),
      unit: '',
      status: 'Collected',
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'purple' as const
    }
  ];

  // Prepare chart data - take last 30 entries and sort by timestamp
  const chartData = validGaitData
    .slice(-30)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    .map((d, index) => ({
      timestamp: d.timestamp 
        ? new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : `${index + 1}`,
      equilibrium: Number(d.equilibriumScore.toFixed(4)),
      cadence: Number(d.cadence.toFixed(2)),
      speed: Number(d.walkingSpeed.toFixed(4)),
      sway: Number(d.posturalSway.toFixed(2)),
      strideLength: Number(d.strideLength.toFixed(3)),
      frequency: Number((d.frequency || 0).toFixed(3)),
      steps: d.steps || 0,
    }));

  // Custom tooltip for better data display
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
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
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Data</SelectItem>
                <SelectItem value="1hour">Last Hour</SelectItem>
                <SelectItem value="24hours">Last 24h</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
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
              <p className="text-sm text-muted-foreground">Real-time equilibrium trends (Last 30 readings)</p>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fontSize: 10 }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="equilibrium" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={2} 
                      dot={false}
                      name="Equilibrium"
                      animationDuration={300}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cadence Data Chart */}
          <Card className="bg-gradient-primary border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Cadence Data
              </CardTitle>
              <p className="text-sm text-muted-foreground">Real-time cadence patterns (Last 30 readings)</p>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fontSize: 10 }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="cadence" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                      dot={false}
                      name="Cadence (steps/min)"
                      animationDuration={300}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Walking Speed Chart */}
          <Card className="bg-gradient-warning border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Walking Speed
              </CardTitle>
              <p className="text-sm text-muted-foreground">Real-time speed variations (Last 30 readings)</p>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fontSize: 10 }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="speed" 
                      stroke="hsl(var(--warning))" 
                      strokeWidth={2} 
                      dot={false}
                      name="Speed (m/s)"
                      animationDuration={300}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Postural Sway Chart */}
          <Card className="bg-gradient-purple border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Postural Sway
              </CardTitle>
              <p className="text-sm text-muted-foreground">Real-time balance stability (Last 30 readings)</p>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fontSize: 10 }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="sway" 
                      stroke="rgb(147 51 234)" 
                      strokeWidth={2} 
                      dot={false}
                      name="Sway (mm)"
                      animationDuration={300}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}