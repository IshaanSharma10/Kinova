import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  Brain,
  Download,
  RefreshCw
} from 'lucide-react';
import { gsap } from 'gsap';

export default function Insights() {
  const headerRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const curveRef = useRef<HTMLDivElement>(null);
  const recommendationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Kinova - Insights';
    
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }
      );
    }

    if (scoreRef.current) {
      gsap.fromTo(
        scoreRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1, ease: 'back.out(1.7)', delay: 0.3 }
      );
    }

    if (curveRef.current) {
      gsap.fromTo(
        curveRef.current,
        { x: -50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.5 }
      );
    }

    if (recommendationsRef.current) {
      gsap.fromTo(
        recommendationsRef.current,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.7 }
      );
    }
  }, []);

  const gaitScore = 87;
  const scoreHistory = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    score: Math.random() * 20 + 75 + Math.sin(i / 5) * 5
  }));

  const insights = [
    {
      type: 'positive',
      icon: <CheckCircle className="w-5 h-5" />,
      title: 'Excellent Balance Control',
      description: 'Your equilibrium scores have improved by 12% over the past week.',
      color: 'success'
    },
    {
      type: 'warning',
      icon: <AlertTriangle className="w-5 h-5" />,
      title: 'Cadence Variability',
      description: 'Step rhythm shows increased variation during longer sessions.',
      color: 'warning'
    },
    {
      type: 'positive',
      icon: <TrendingUp className="w-5 h-5" />,
      title: 'Stride Consistency',
      description: 'Walking pattern has become more regular and predictable.',
      color: 'primary'
    }
  ];

  const recommendations = [
    {
      title: 'Balance Training',
      description: 'Incorporate single-leg stands for 30 seconds daily',
      priority: 'high'
    },
    {
      title: 'Rhythm Exercises',
      description: 'Practice metronome-guided walking to improve cadence',
      priority: 'medium'
    },
    {
      title: 'Flexibility Work',
      description: 'Hip and ankle mobility exercises before sessions',
      priority: 'low'
    }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div ref={headerRef} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gait Insights</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              AI-powered gait analysis and personalized recommendations
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              <RefreshCw className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Refresh Analysis</span>
              <span className="sm:hidden">Refresh</span>
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none">
              <Download className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </div>

        {/* Overall Gait Score */}
        <Card ref={scoreRef} className="bg-gradient-primary border-border/50">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              Overall Gait Score
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="relative">
              <div className="w-32 h-32 mx-auto">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="3"
                  />
                  <path
                    d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                    fill="none"
                    stroke="hsl(var(--success))"
                    strokeWidth="3"
                    strokeDasharray={`${gaitScore}, 100`}
                    className="drop-shadow-sm"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className={`text-3xl font-bold ${getScoreColor(gaitScore)}`}>
                    {gaitScore}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
            </div>
            <div>
              <Badge variant="secondary" className="text-sm">
                {getScoreLabel(gaitScore)}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Based on 8 gait parameters over the last 30 days
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Score Trend Curve */}
          <Card ref={curveRef} className="bg-gradient-primary border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Score Progression
              </CardTitle>
              <p className="text-sm text-muted-foreground">30-day gait score trend</p>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-card/30 rounded-lg border border-border/30 p-4">
                <svg className="w-full h-full">
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1"/>
                    </linearGradient>
                  </defs>
                  {/* Score curve */}
                  <path
                    d={`M 0 ${200 - (scoreHistory[0].score - 60) * 3} ${scoreHistory.map((d, i) => 
                      `L ${(i / (scoreHistory.length - 1)) * 320} ${200 - (d.score - 60) * 3}`
                    ).join(' ')}`}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    className="drop-shadow-sm"
                  />
                  {/* Area fill */}
                  <path
                    d={`M 0 ${200 - (scoreHistory[0].score - 60) * 3} ${scoreHistory.map((d, i) => 
                      `L ${(i / (scoreHistory.length - 1)) * 320} ${200 - (d.score - 60) * 3}`
                    ).join(' ')} L 320 200 L 0 200 Z`}
                    fill="url(#scoreGradient)"
                  />
                  {/* Current score point */}
                  <circle
                    cx="320"
                    cy={200 - (scoreHistory[scoreHistory.length - 1].score - 60) * 3}
                    r="4"
                    fill="hsl(var(--primary))"
                    className="drop-shadow-sm"
                  />
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <Card ref={recommendationsRef} className="bg-gradient-primary border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Key Insights
              </CardTitle>
              <p className="text-sm text-muted-foreground">AI-generated observations</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-card/30 rounded-lg border border-border/30">
                  <div className={`text-${insight.color} mt-1`}>
                    {insight.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground text-sm">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        <Card className="bg-gradient-primary border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Personalized Recommendations
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Tailored exercises to improve your gait performance
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((rec, index) => (
                <div key={index} className="p-4 bg-card/30 rounded-lg border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground">{rec.title}</h4>
                    <Badge 
                      variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}