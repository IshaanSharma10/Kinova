import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricCard } from '@/components/ui/metric-card';
import { 
  BarChart3, 
  Calendar, 
  Target,
  Activity,
  Timer,
  Footprints,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { gsap } from 'gsap';
import { useGaitMetrics } from '@/hooks/useGaitMetrics';

// Import Recharts components
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Analytics() {
  const headerRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<HTMLDivElement>(null);
  const expandedChartsRef = useRef<HTMLDivElement>(null);

  const { data: gaitData, loading, error } = useGaitMetrics();
  const [showAllCharts, setShowAllCharts] = useState(false);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
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

  // Animate expanded charts when shown - MUST be before conditional returns
  useEffect(() => {
    if (showAllCharts && expandedChartsRef.current) {
      gsap.fromTo(expandedChartsRef.current, 
        { y: 30, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, [showAllCharts]);

  // ALL useMemo hooks MUST be called BEFORE any conditional returns
  // Filter out any invalid entries (like 'average_scores') before processing
  const validGaitData = useMemo(() => {
    if (!gaitData) return [];
    
    return gaitData.filter(entry => 
      entry && 
      entry._key && 
      entry._key.startsWith('-') && // Only Firebase push IDs
      typeof entry.equilibriumScore === 'number' && 
      typeof entry.cadence === 'number' &&
      typeof entry.strideLength === 'number' &&
      typeof entry.walkingSpeed === 'number' &&
      typeof entry.posturalSway === 'number'
    );
  }, [gaitData]);

  // Calculate dynamic metrics from ALL the filtered data
  const analyticsMetricsData = useMemo(() => {
    if (validGaitData.length === 0) {
      return {
        avgEquilibrium: 0,
        peakCadence: 0,
        strideVariance: 0,
        avgWalkingSpeed: 0,
        totalSteps: 0,
        avgFrequency: 0,
      };
    }

    const totalEquilibrium = validGaitData.reduce((sum, entry) => sum + (entry.equilibriumScore || 0), 0);
    const avgEquilibrium = totalEquilibrium / validGaitData.length;
    
    const peakCadence = validGaitData.reduce((max, entry) => Math.max(max, entry.cadence || 0), 0);
    
    const totalStrideLength = validGaitData.reduce((sum, entry) => sum + (entry.strideLength || 0), 0);
    const avgStrideLength = totalStrideLength / validGaitData.length;
    
    const variance = validGaitData.reduce((sum, entry) => 
      sum + Math.pow((entry.strideLength || 0) - avgStrideLength, 2), 0
    ) / validGaitData.length;
    const strideVariance = Math.sqrt(variance) * 100; // Convert to cm

    const totalWalkingSpeed = validGaitData.reduce((sum, entry) => sum + (entry.walkingSpeed || 0), 0);
    const avgWalkingSpeed = totalWalkingSpeed / validGaitData.length;

    const totalSteps = validGaitData.reduce((sum, entry) => sum + (entry.steps || 0), 0);
    
    const totalFrequency = validGaitData.reduce((sum, entry) => sum + (entry.frequency || 0), 0);
    const avgFrequency = totalFrequency / validGaitData.length;

    return {
      avgEquilibrium,
      peakCadence,
      strideVariance,
      avgWalkingSpeed,
      totalSteps,
      avgFrequency,
    };
  }, [validGaitData]);

  const { avgEquilibrium, peakCadence, strideVariance, avgWalkingSpeed, totalSteps, avgFrequency } = analyticsMetricsData;

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

  // Use useMemo to ensure metrics array updates when data changes
  const analyticsMetrics = useMemo(() => [
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
  ], [avgEquilibrium, peakCadence, strideVariance, validGaitData.length]);

  // Helper function to format timestamp from Firebase
  // Firebase timestamps can be in seconds or milliseconds
  const formatTimestamp = (timestamp: number | undefined, index: number): string => {
    if (!timestamp || timestamp === 0) {
      // If no timestamp, use current time minus offset
      const now = Date.now();
      const offsetTime = now - ((validGaitData.length - index - 1) * 60000); // 1 minute intervals
      return new Date(offsetTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    }

    // Check if timestamp is in seconds (less than 10 billion)
    // Firebase push IDs or server timestamps might be in seconds
    let timestampMs = timestamp;
    if (timestamp > 0 && timestamp < 10000000000) {
      timestampMs = timestamp * 1000; // Convert seconds to milliseconds
    }

    const date = new Date(timestampMs);
    
    // Validate date - ensure it's not from 1970 epoch or invalid
    if (isNaN(date.getTime()) || date.getTime() < 946684800000) { // Before Jan 1, 2000
      // Fallback to current time with offset
      const now = Date.now();
      const offsetTime = now - ((validGaitData.length - index - 1) * 60000);
      return new Date(offsetTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    }

    // Format as HH:MM:SS (24-hour format)
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Prepare chart data - take last 15 entries and sort by timestamp
  // Use actual Firebase timestamp for accurate time display
  // Use useMemo to ensure chart data updates when validGaitData changes
  const chartData = useMemo(() => {
    return validGaitData
      .slice(-15)
      .sort((a, b) => {
        // Sort by timestamp, handling both seconds and milliseconds
        const timeA = a.timestamp || 0;
        const timeB = b.timestamp || 0;
        const msA = timeA > 0 && timeA < 10000000000 ? timeA * 1000 : timeA;
        const msB = timeB > 0 && timeB < 10000000000 ? timeB * 1000 : timeB;
        return msA - msB;
      })
      .map((d, index) => {
        // Get the actual timestamp from Firebase
        const rawTimestamp = d.timestamp || 0;
        const timestampMs = rawTimestamp > 0 && rawTimestamp < 10000000000 
          ? rawTimestamp * 1000 
          : rawTimestamp;
        
        return {
          timestamp: formatTimestamp(d.timestamp, index),
          timestampRaw: timestampMs, // Keep raw for tooltip
          date: new Date(timestampMs || Date.now()), // Date object for tooltip
          equilibrium: Number((d.equilibriumScore || 0).toFixed(4)),
          cadence: Number((d.cadence || 0).toFixed(2)),
          kneeForce: Number((d.kneeForce || 0).toFixed(4)),
          sway: Number((d.posturalSway || 0).toFixed(2)),
          strideLength: Number((d.strideLength || 0).toFixed(3)),
          walkingSpeed: Number((d.walkingSpeed || 0).toFixed(3)),
          frequency: Number((d.frequency || 0).toFixed(3)),
          steps: d.steps || 0,
          stepWidth: Number((d.stepWidth || 0).toFixed(4)),
          pressureLeft: Number((d.pressureLeft || 0).toFixed(2)),
          pressureRight: Number((d.pressureRight || 0).toFixed(2)),
        };
      });
  }, [validGaitData]);

  // Custom tooltip for better data display with full timestamp
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Get the full date from the payload if available
      const dataPoint = payload[0]?.payload;
      const fullTimestamp = dataPoint?.date 
        ? dataPoint.date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })
        : label;

      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-2">{fullTimestamp}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs mb-1" style={{ color: entry.color }}>
              <span className="font-semibold">{entry.name}:</span> {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // NOW we can have conditional returns - AFTER all hooks are called
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

  if (validGaitData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl font-semibold text-muted-foreground">
          No valid historical data available to display.
        </p>
      </div>
    );
  }
  
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
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Calendar className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Custom Range</span>
              <span className="sm:hidden">Range</span>
            </Button>
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
              <p className="text-sm text-muted-foreground">Real-time equilibrium trends (Last 15 readings)</p>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    key={`equilibrium-${chartData.length}-${chartData[chartData.length - 1]?.timestampRaw || Date.now()}`}
                    data={chartData} 
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
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
                      isAnimationActive={true}
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
              <p className="text-sm text-muted-foreground">Real-time cadence patterns (Last 15 readings)</p>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    key={`cadence-${chartData.length}-${chartData[chartData.length - 1]?.timestampRaw || Date.now()}`}
                    data={chartData} 
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
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
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Knee Force Chart */}
          <Card className="bg-gradient-warning border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Knee Force
              </CardTitle>
              <p className="text-sm text-muted-foreground">Real-time knee force variations (Last 15 readings)</p>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    key={`kneeForce-${chartData.length}-${chartData[chartData.length - 1]?.timestampRaw || Date.now()}`}
                    data={chartData} 
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
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
                      dataKey="kneeForce" 
                      stroke="hsl(var(--warning))" 
                      strokeWidth={2} 
                      dot={false}
                      name="Knee Force (N)"
                      animationDuration={300}
                      isAnimationActive={true}
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
              <p className="text-sm text-muted-foreground">Real-time balance stability (Last 15 readings)</p>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    key={`sway-${chartData.length}-${chartData[chartData.length - 1]?.timestampRaw || Date.now()}`}
                    data={chartData} 
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
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
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View All Parameters Button */}
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowAllCharts(!showAllCharts)}
            className="flex items-center gap-2 bg-card/50 border-border hover:bg-card transition-all duration-300"
          >
            {showAllCharts ? (
              <>
                <ChevronUp className="w-5 h-5" />
                View Less Parameters
              </>
            ) : (
              <>
                <ChevronDown className="w-5 h-5" />
                View All Parameters
              </>
            )}
          </Button>
        </div>

        {/* Expanded Charts - All Parameters */}
        {showAllCharts && (
          <div ref={expandedChartsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6">
            {/* Stride Length Chart */}
            <Card className="bg-gradient-primary border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Stride Length
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Real-time stride length trends (Last 15 readings)
                </p>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      key={`strideLength-${chartData.length}-${chartData[chartData.length - 1]?.timestampRaw || Date.now()}`}
                      data={chartData} 
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
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
                        dataKey="strideLength" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2} 
                        dot={false}
                        name="Stride Length (m)"
                        animationDuration={300}
                        isAnimationActive={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Walking Speed Chart */}
            <Card className="bg-gradient-success border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Walking Speed
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Real-time walking speed patterns (Last 15 readings)
                </p>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      key={`walkingSpeed-${chartData.length}-${chartData[chartData.length - 1]?.timestampRaw || Date.now()}`}
                      data={chartData} 
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
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
                        dataKey="walkingSpeed" 
                        stroke="hsl(var(--success))" 
                        strokeWidth={2} 
                        dot={false}
                        name="Walking Speed (m/s)"
                        animationDuration={300}
                        isAnimationActive={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Frequency Chart */}
            <Card className="bg-gradient-warning border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Frequency
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Real-time step frequency (Last 15 readings)
                </p>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      key={`frequency-${chartData.length}-${chartData[chartData.length - 1]?.timestampRaw || Date.now()}`}
                      data={chartData} 
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
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
                        dataKey="frequency" 
                        stroke="hsl(var(--warning))" 
                        strokeWidth={2} 
                        dot={false}
                        name="Frequency (Hz)"
                        animationDuration={300}
                        isAnimationActive={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Steps Chart */}
            <Card className="bg-gradient-purple border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Steps Count
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Real-time step count (Last 15 readings)
                </p>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      key={`steps-${chartData.length}-${chartData[chartData.length - 1]?.timestampRaw || Date.now()}`}
                      data={chartData} 
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
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
                        dataKey="steps" 
                        stroke="rgb(147 51 234)" 
                        strokeWidth={2} 
                        dot={false}
                        name="Steps"
                        animationDuration={300}
                        isAnimationActive={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Step Width Chart */}
            {chartData.some(d => d.stepWidth > 0) && (
              <Card className="bg-gradient-primary border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Step Width
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Real-time step width variations (Last 15 readings)
                  </p>
                </CardHeader>
                <CardContent>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        key={`stepWidth-${chartData.length}-${chartData[chartData.length - 1]?.timestampRaw || Date.now()}`}
                        data={chartData} 
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
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
                          dataKey="stepWidth" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2} 
                          dot={false}
                          name="Step Width (m)"
                          animationDuration={300}
                          isAnimationActive={true}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Foot Pressure Chart - Left & Right */}
            <Card className="bg-gradient-success border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Foot Pressure
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Real-time left and right foot pressure (Last 15 readings)
                </p>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      key={`pressure-${chartData.length}-${chartData[chartData.length - 1]?.timestampRaw || Date.now()}`}
                      data={chartData} 
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
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
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="pressureLeft" 
                        stroke="#3b82f6"
                        strokeWidth={2} 
                        dot={false}
                        name="Left Foot"
                        animationDuration={300}
                        isAnimationActive={true}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="pressureRight" 
                        stroke="#ef4444"
                        strokeWidth={2} 
                        dot={false}
                        name="Right Foot"
                        animationDuration={300}
                        isAnimationActive={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}