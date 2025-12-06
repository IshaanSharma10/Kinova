import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LiveIndicator } from '@/components/ui/live-indicator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart } from 'recharts';
import gsap from 'gsap';
import { Activity, TrendingUp, TrendingDown, Target, Lightbulb, Calendar, CheckCircle2, AlertCircle, Info, Zap, BarChart3, ChevronRight, Scale, Footprints, Gauge, Timer, Loader2, Brain, Download, User, Ruler, Weight, Edit3, Save, X } from 'lucide-react';
import { useGaitMetrics, GaitDataEntry } from '@/hooks/useGaitMetrics';
import { useMLInsightsFromFirebase } from '@/hooks/useMLInsightsFromFirebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MetricData {
  parameter: string;
  actual: number;
  ideal: number;
  unit: string;
  category: string;
  description: string;
  relatedTo: string;
  icon: React.ElementType;
}

interface UserProfile {
  height: number; // cm
  weight: number; // kg
  age?: number;
  gender?: 'male' | 'female' | 'other';
}

// Research-based formulas for calculating ideal gait parameters
// Based on biomechanical research and clinical studies
const calculateIdealParameters = (profile: UserProfile) => {
  const { height, weight } = profile;
  const heightM = height / 100; // Convert to meters
  const bmi = weight / (heightM * heightM);
  const legLength = height * 0.53; // Leg length is approximately 53% of height
  
  // Cadence: Decreases with height (taller people take fewer, longer steps)
  // Reference: Bohannon, R.W. (1997) - Comfortable and maximum walking speed
  // Formula adjusted for height: base cadence adjusted by height deviation from average (170cm)
  const idealCadence = Math.round(115 - (height - 170) * 0.15);
  
  // Walking Speed: Correlates with leg length
  // Reference: Oberg et al. (1993) - Basic gait parameters
  // Formula: ~0.9-1.0 × leg length in meters for comfortable walking
  const idealWalkingSpeed = parseFloat((legLength / 100 * 0.95).toFixed(2));
  
  // Stride Length: ~40-45% of height
  // Reference: Murray et al. (1964) - Walking patterns of normal men
  const idealStrideLength = parseFloat((height * 0.43 / 100).toFixed(3));
  
  // Step Width: Related to height for stability
  // Reference: Gabell & Nayak (1984) - Variability of gait parameters
  // Normal range: 5-13cm, slightly wider for taller individuals
  const idealStepWidth = parseFloat((0.06 + (height - 150) * 0.0008).toFixed(4));
  
  // Knee Force: Approximately 1.5-2x body weight during normal walking
  // Reference: Kutzner et al. (2010) - In vivo knee joint forces
  const idealKneeForce = Math.round(weight * 9.81 * 1.5);
  
  // Step Frequency (Hz): Derived from cadence
  // Frequency = Cadence / 60
  const idealFrequency = parseFloat((idealCadence / 60).toFixed(3));
  
  // Postural Sway: Increases with BMI and height
  // Reference: Hue et al. (2007) - Body weight and postural sway
  // Lower is better, adjusted for body composition
  const baseSway = 12; // mm for ideal BMI
  const bmiAdjustment = Math.max(0, (bmi - 22) * 0.5);
  const heightAdjustment = (height - 170) * 0.03;
  const idealPosturalSway = parseFloat((baseSway + bmiAdjustment + heightAdjustment).toFixed(1));
  
  // Equilibrium Score: Inversely related to BMI extremes
  // Reference: Greve et al. (2007) - Correlation between BMI and postural balance
  // Optimal BMI (20-25) gives best balance
  let idealEquilibrium = 0.95;
  if (bmi < 18.5 || bmi > 30) {
    idealEquilibrium = 0.85;
  } else if (bmi < 20 || bmi > 27) {
    idealEquilibrium = 0.90;
  }
  
  return {
    cadence: idealCadence,
    walkingSpeed: idealWalkingSpeed,
    strideLength: idealStrideLength,
    stepWidth: idealStepWidth,
    kneeForce: idealKneeForce,
    frequency: idealFrequency,
    posturalSway: idealPosturalSway,
    equilibriumScore: idealEquilibrium,
    bmi: parseFloat(bmi.toFixed(1)),
    legLength: parseFloat(legLength.toFixed(1)),
  };
};

// Default profile values
const DEFAULT_PROFILE: UserProfile = {
  height: 170,
  weight: 70,
};

// Load profile from localStorage
const loadProfile = (): UserProfile => {
  try {
    const saved = localStorage.getItem('kinova_user_profile');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading profile:', e);
  }
  return DEFAULT_PROFILE;
};

// Save profile to localStorage
const saveProfile = (profile: UserProfile) => {
  try {
    localStorage.setItem('kinova_user_profile', JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving profile:', e);
  }
};

const Comparison = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  
  // User profile state
  const [userProfile, setUserProfile] = useState<UserProfile>(loadProfile);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState<UserProfile>(userProfile);
  const [isProfileSet, setIsProfileSet] = useState(() => {
    // Check if profile has been explicitly saved by user
    const saved = localStorage.getItem('kinova_user_profile');
    if (saved) return true;
    // Auto-set default profile if not saved
    saveProfile(DEFAULT_PROFILE);
    return false; // Still show as not explicitly set, but allow content
  });
  const [showProfilePrompt, setShowProfilePrompt] = useState(() => {
    // Show prompt if profile hasn't been explicitly set by user
    return !localStorage.getItem('kinova_user_profile');
  });
  
  // Fetch real-time data from Firebase
  const { data: gaitData, loading, error } = useGaitMetrics();
  
  // Fetch ML insights (gait score) from Firebase
  const { data: mlData, loading: mlLoading } = useMLInsightsFromFirebase('/gaitData/average_scores');
  
  // Calculate ideal parameters based on user profile
  const idealParameters = useMemo(() => {
    return calculateIdealParameters(userProfile);
  }, [userProfile]);

  // Handle profile save
  const handleSaveProfile = useCallback(() => {
    if (tempProfile.height >= 100 && tempProfile.height <= 250 && 
        tempProfile.weight >= 30 && tempProfile.weight <= 300) {
      setUserProfile(tempProfile);
      saveProfile(tempProfile);
      setIsProfileSet(true); // Mark profile as set
      setIsEditingProfile(false);
      setShowProfilePrompt(false);
    }
  }, [tempProfile]);

  // Handle profile cancel
  const handleCancelEdit = useCallback(() => {
    setTempProfile(userProfile);
    setIsEditingProfile(false);
    if (showProfilePrompt && localStorage.getItem('kinova_user_profile')) {
      setShowProfilePrompt(false);
    }
  }, [userProfile, showProfilePrompt]);


  useEffect(() => {
    document.title = 'Biomechanical Comparison | Kinova';

    let ctx: gsap.Context | null = null;

    // Use a timeout to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!loading) {
        ctx = gsap.context(() => {
          // Animate header
          if (headerRef.current) {
            gsap.fromTo(headerRef.current, 
              { y: -30, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
            );
          }

          // Animate hero stats
          const heroStats = document.querySelectorAll('.hero-stat');
          if (heroStats.length > 0) {
            gsap.fromTo(heroStats,
              { scale: 0.8, opacity: 0 },
              { scale: 1, opacity: 1, duration: 0.5, stagger: 0.1, delay: 0.2, ease: 'back.out(1.5)' }
            );
          }

          // Animate main cards
          const mainCards = document.querySelectorAll('.main-card');
          if (mainCards.length > 0) {
            gsap.fromTo(mainCards,
              { y: 40, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.7, stagger: 0.15, delay: 0.4, ease: 'power3.out' }
            );
          }

          // Animate metric items
          const metricItems = document.querySelectorAll('.metric-item');
          if (metricItems.length > 0) {
            gsap.fromTo(metricItems,
              { x: -20, opacity: 0 },
              { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, delay: 0.6, ease: 'power2.out' }
            );
          }

          // Animate insight cards
          const insightCards = document.querySelectorAll('.insight-card');
          if (insightCards.length > 0) {
            gsap.fromTo(insightCards,
              { y: 20, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, delay: 0.8, ease: 'power2.out' }
            );
          }
        });
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (ctx) {
        ctx.revert();
      }
    };
  }, [loading, activeTab]);

  // Format value with proper null checking
  const formatValue = (value: number | undefined, decimals: number = 2): number => {
    if (value === null || value === undefined || isNaN(value)) return 0;
    return parseFloat(value.toFixed(decimals));
  };

  // Get latest entry from Firebase data
  const latestEntry = useMemo(() => {
    if (!gaitData || gaitData.length === 0) return null;
    return gaitData[0];
  }, [gaitData]);

  // Transform Firebase data to metrics format using personalized ideal values
  const metricsData: MetricData[] = useMemo(() => {
    if (!latestEntry) return [];

    return [
      {
        parameter: 'Equilibrium',
        actual: formatValue(latestEntry.equilibriumScore, 4),
        ideal: idealParameters.equilibriumScore,
        unit: 'score',
        category: 'Balance',
        description: 'Balance & Stability Score',
        relatedTo: `BMI: ${idealParameters.bmi}`,
        icon: Target
      },
      {
        parameter: 'Postural Sway',
        actual: formatValue(latestEntry.posturalSway, 2),
        ideal: idealParameters.posturalSway,
        unit: 'mm',
        category: 'Balance',
        description: 'Body Oscillation',
        relatedTo: `BMI-adjusted`,
        icon: Activity
      },
      {
        parameter: 'Cadence',
        actual: formatValue(latestEntry.cadence, 1),
        ideal: idealParameters.cadence,
        unit: 'steps/min',
        category: 'Gait Parameters',
        description: 'Step Rate',
        relatedTo: `Height: ${userProfile.height}cm`,
        icon: Gauge
      },
      {
        parameter: 'Frequency',
        actual: formatValue(latestEntry.frequency, 3),
        ideal: idealParameters.frequency,
        unit: 'Hz',
        category: 'Gait Parameters',
        description: 'Step Frequency',
        relatedTo: 'Gait Rhythm',
        icon: Timer
      },
      {
        parameter: 'Step Width',
        actual: formatValue(latestEntry.stepWidth, 4),
        ideal: idealParameters.stepWidth,
        unit: 'm',
        category: 'Gait Parameters',
        description: 'Lateral Step Distance',
        relatedTo: `Height: ${userProfile.height}cm`,
        icon: Footprints
      },
      {
        parameter: 'Knee Force',
        actual: formatValue(latestEntry.kneeForce, 1),
        ideal: idealParameters.kneeForce,
        unit: 'N',
        category: 'Biomechanics',
        description: 'Peak Knee Joint Force',
        relatedTo: `Weight: ${userProfile.weight}kg`,
        icon: Zap
      },
      {
        parameter: 'Walking Speed',
        actual: formatValue(latestEntry.walkingSpeed, 3),
        ideal: idealParameters.walkingSpeed,
        unit: 'm/s',
        category: 'Gait Parameters',
        description: 'Average Walking Velocity',
        relatedTo: `Leg: ${idealParameters.legLength}cm`,
        icon: TrendingUp
      },
      {
        parameter: 'Stride Length',
        actual: formatValue(latestEntry.strideLength, 3),
        ideal: idealParameters.strideLength,
        unit: 'm',
        category: 'Gait Parameters',
        description: 'Distance Per Stride',
        relatedTo: `Height: ${userProfile.height}cm`,
        icon: Footprints
      }
    ];
  }, [latestEntry, idealParameters, userProfile]);

  // Transform data for radar chart
  const radarData = useMemo(() => {
    return metricsData.map(metric => ({
      subject: metric.parameter,
      actual: metric.ideal > 0 ? (metric.actual / metric.ideal) * 100 : 0,
      ideal: 100,
      fullMark: 150
    }));
  }, [metricsData]);

  // Historical trend data from last entries
  const historicalData = useMemo(() => {
    if (!gaitData || gaitData.length === 0) return [];
    
    // Reverse to show oldest first, take up to 10 entries
    const entries = [...gaitData].reverse().slice(-10);
    
    return entries.map((entry, index) => ({
      index: index + 1,
      label: `T${index + 1}`,
      equilibrium: formatValue(entry.equilibriumScore, 4),
      posturalSway: formatValue(entry.posturalSway, 2),
      cadence: formatValue(entry.cadence, 1),
      speed: formatValue(entry.walkingSpeed, 3),
      kneeForce: formatValue(entry.kneeForce, 1),
      frequency: formatValue(entry.frequency, 3),
    }));
  }, [gaitData]);

  // Correlation data based on actual metrics
  const correlationData = useMemo(() => {
    if (!metricsData.length) return [];
    
    const equilibriumMetric = metricsData.find(m => m.parameter === 'Equilibrium');
    const swayMetric = metricsData.find(m => m.parameter === 'Postural Sway');
    const cadenceMetric = metricsData.find(m => m.parameter === 'Cadence');
    const speedMetric = metricsData.find(m => m.parameter === 'Walking Speed');
    
    return [
      { 
        pair: 'Equilibrium ↔ Sway', 
        strength: equilibriumMetric && swayMetric ? Math.min(95, Math.round((equilibriumMetric.actual / equilibriumMetric.ideal) * 100)) : 0,
        color: 'hsl(var(--primary))' 
      },
      { 
        pair: 'Cadence ↔ Speed', 
        strength: cadenceMetric && speedMetric ? Math.min(95, Math.round((cadenceMetric.actual / cadenceMetric.ideal) * 100)) : 0,
        color: 'hsl(180 100% 60%)' 
      },
      { 
        pair: 'Speed ↔ Stride', 
        strength: speedMetric ? Math.min(95, Math.round((speedMetric.actual / speedMetric.ideal) * 100)) : 0,
        color: 'hsl(38 92% 50%)' 
      },
      { 
        pair: 'Balance ↔ Force', 
        strength: equilibriumMetric ? Math.min(95, Math.round((equilibriumMetric.actual / equilibriumMetric.ideal) * 85)) : 0,
        color: 'hsl(142 76% 36%)' 
      },
    ];
  }, [metricsData]);

  // Generate dynamic recommendations based on actual data
  const recommendations = useMemo(() => {
    if (!metricsData.length) return [];
    
    const recs = [];
    
    const equilibrium = metricsData.find(m => m.parameter === 'Equilibrium');
    const cadence = metricsData.find(m => m.parameter === 'Cadence');
    const kneeForce = metricsData.find(m => m.parameter === 'Knee Force');
    const speed = metricsData.find(m => m.parameter === 'Walking Speed');
    const sway = metricsData.find(m => m.parameter === 'Postural Sway');
    
    if (equilibrium && equilibrium.actual < equilibrium.ideal * 0.9) {
      recs.push({
        title: 'Improve Balance Score',
        description: `Your equilibrium score is ${((equilibrium.actual / equilibrium.ideal) * 100).toFixed(0)}% of ideal. Focus on core strengthening exercises.`,
        priority: 'high',
        icon: Target,
        action: 'View Balance Exercises',
        impact: `+${Math.round((equilibrium.ideal - equilibrium.actual) * 100)}%`,
        impactLabel: 'Balance'
      });
    }
    
    if (cadence && cadence.actual < cadence.ideal * 0.9) {
      recs.push({
        title: 'Increase Cadence',
        description: `Target ${cadence.ideal} steps/min for optimal gait efficiency. Current: ${cadence.actual.toFixed(0)} steps/min.`,
        priority: 'medium',
        icon: Gauge,
        action: 'Start Training',
        impact: `+${Math.round(cadence.ideal - cadence.actual)}`,
        impactLabel: 'Steps/min'
      });
    }
    
    if (kneeForce && kneeForce.actual > kneeForce.ideal * 1.1) {
      recs.push({
        title: 'Reduce Knee Loading',
        description: `Knee force is ${((kneeForce.actual / kneeForce.ideal - 1) * 100).toFixed(0)}% above ideal. Consider gait modifications.`,
        priority: 'high',
        icon: AlertCircle,
        action: 'View Exercise Plan',
        impact: `-${Math.round(kneeForce.actual - kneeForce.ideal)}N`,
        impactLabel: 'Force'
      });
    }
    
    if (speed && speed.actual < speed.ideal * 0.9) {
      recs.push({
        title: 'Improve Walking Speed',
        description: `Increase stride length to boost speed from ${speed.actual.toFixed(2)} to ${speed.ideal.toFixed(2)} m/s.`,
        priority: 'medium',
        icon: Zap,
        action: 'View Technique Tips',
        impact: `+${((speed.ideal - speed.actual) * 100 / speed.ideal).toFixed(0)}%`,
        impactLabel: 'Speed'
      });
    }

    if (sway && sway.actual > sway.ideal * 1.2) {
      recs.push({
        title: 'Reduce Postural Sway',
        description: `Postural sway is elevated at ${sway.actual.toFixed(1)}mm. Work on stability exercises.`,
        priority: 'high',
        icon: Activity,
        action: 'View Stability Program',
        impact: `-${(sway.actual - sway.ideal).toFixed(1)}mm`,
        impactLabel: 'Sway'
      });
    }
    
    // Add a positive recommendation if most metrics are good
    const goodMetrics = metricsData.filter(m => {
      const ratio = m.actual / m.ideal;
      return ratio >= 0.9 && ratio <= 1.1;
    });
    
    if (goodMetrics.length >= 5) {
      recs.push({
        title: 'Maintain Current Performance',
        description: `${goodMetrics.length} of ${metricsData.length} parameters are in optimal range. Keep up the great work!`,
        priority: 'low',
        icon: CheckCircle2,
        action: 'Track Progress',
        impact: `${goodMetrics.length}/${metricsData.length}`,
        impactLabel: 'Optimal'
      });
    }
    
    return recs;
  }, [metricsData]);

  const getComparisonStatus = (actual: number, ideal: number) => {
    // Handle edge cases
    if (ideal === 0 || actual === undefined || ideal === undefined) {
      return { status: 'unknown' as const, icon: AlertCircle, color: 'text-muted-foreground', bgColor: 'bg-muted/20', borderColor: 'border-muted/30' };
    }
    const diff = ((actual - ideal) / ideal) * 100;
    if (Math.abs(diff) < 15) {
      return { status: 'optimal' as const, icon: CheckCircle2, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/30' };
    }
    if (diff > 0) {
      return { status: 'above' as const, icon: TrendingUp, color: 'text-amber-400', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/30' };
    }
    return { status: 'below' as const, icon: TrendingDown, color: 'text-sky-400', bgColor: 'bg-sky-500/20', borderColor: 'border-sky-500/30' };
  };

  const getDeviationPercent = (actual: number, ideal: number) => {
    if (ideal === 0) return '0.0';
    return ((actual - ideal) / ideal * 100).toFixed(1);
  };

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'Balance': return 'bg-primary/10 text-primary border-primary/20';
      case 'Anthropometric': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'Gait Parameters': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'Biomechanics': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Get ML gait score and classification
  const mlGaitScore = useMemo(() => {
    return typeof mlData?.avgGaitScoreLast20 === 'number' ? mlData.avgGaitScoreLast20 : null;
  }, [mlData]);

  const mlClassification = useMemo(() => {
    return mlData?.avgClassificationLast20 ?? null;
  }, [mlData]);

  // Helper to get score color
  const getScoreColor = (score: number) => {
    if (score >= 70) return { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', ring: 'hsl(142 76% 36%)' };
    if (score >= 40) return { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', ring: 'hsl(38 92% 50%)' };
    return { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', ring: 'hsl(0 84% 60%)' };
  };

  // Get score label
  const getScoreLabel = (score: number): string => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 40) return 'Moderate';
    return 'Needs Work';
  };

  // Calculate summary stats
  const { optimalCount, aboveCount, belowCount, overallScore } = useMemo(() => {
    if (!metricsData.length) return { optimalCount: 0, aboveCount: 0, belowCount: 0, overallScore: 0 };
    
    const optimal = metricsData.filter(m => getComparisonStatus(m.actual, m.ideal).status === 'optimal').length;
    const above = metricsData.filter(m => getComparisonStatus(m.actual, m.ideal).status === 'above').length;
    const below = metricsData.filter(m => getComparisonStatus(m.actual, m.ideal).status === 'below').length;
    
    // Use ML gait score if available, otherwise calculate from metrics
    if (mlGaitScore !== null) {
      return { 
        optimalCount: optimal, 
        aboveCount: above, 
        belowCount: below, 
        overallScore: Math.round(Math.max(0, Math.min(100, mlGaitScore)))
      };
    }
    
    // Fallback: Calculate overall score based on how close each metric is to ideal
    const totalScore = metricsData.reduce((acc, m) => {
      if (m.ideal === 0) return acc;
      const ratio = Math.min(m.actual / m.ideal, m.ideal / m.actual);
      return acc + ratio;
    }, 0);
    
    return { 
      optimalCount: optimal, 
      aboveCount: above, 
      belowCount: below, 
      overallScore: Math.round((totalScore / metricsData.length) * 100)
    };
  }, [metricsData, mlGaitScore]);

  // PDF Report Generation
  const generatePDFReport = useCallback(() => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Colors
    const primaryColor: [number, number, number] = [0, 200, 200]; // Cyan
    const darkColor: [number, number, number] = [30, 41, 59];
    const successColor: [number, number, number] = [34, 197, 94];
    const warningColor: [number, number, number] = [251, 191, 36];
    const dangerColor: [number, number, number] = [239, 68, 68];

    // Helper function to add new page if needed
    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // ============ HEADER ============
    // Background header bar
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Kinova Logo/Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('KINOVA', margin, 28);

    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Biomechanical Analysis Report', margin, 38);

    // Report date
    const reportDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.setFontSize(10);
    doc.text(reportDate, pageWidth - margin - doc.getTextWidth(reportDate), 38);

    yPosition = 60;

    // ============ OVERALL SCORE SECTION ============
    doc.setTextColor(...darkColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Overall Gait Score', margin, yPosition);
    yPosition += 10;

    // Score box
    const scoreBoxWidth = 60;
    const scoreBoxHeight = 35;
    const scoreColor = overallScore >= 70 ? successColor : overallScore >= 40 ? warningColor : dangerColor;
    
    doc.setFillColor(...scoreColor);
    doc.roundedRect(margin, yPosition, scoreBoxWidth, scoreBoxHeight, 5, 5, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(`${overallScore}%`, margin + scoreBoxWidth / 2, yPosition + 22, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const scoreLabel = mlClassification || getScoreLabel(overallScore);
    doc.text(scoreLabel, margin + scoreBoxWidth / 2, yPosition + 30, { align: 'center' });

    // Score summary text
    doc.setTextColor(...darkColor);
    doc.setFontSize(11);
    doc.text(`Classification: ${scoreLabel}`, margin + scoreBoxWidth + 15, yPosition + 12);
    doc.text(`Optimal Parameters: ${optimalCount} of ${metricsData.length}`, margin + scoreBoxWidth + 15, yPosition + 22);
    doc.text(`Data Source: ${mlGaitScore !== null ? 'ML Model Analysis' : 'Local Calculation'}`, margin + scoreBoxWidth + 15, yPosition + 32);

    yPosition += scoreBoxHeight + 20;

    // ============ USER PROFILE SECTION ============
    doc.setTextColor(...darkColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('User Profile & Personalized Parameters', margin, yPosition);
    yPosition += 10;

    // Profile info box
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 45, 5, 5, 'F');
    
    doc.setTextColor(...darkColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Body Measurements', margin + 10, yPosition + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Height: ${userProfile.height} cm`, margin + 10, yPosition + 24);
    doc.text(`Weight: ${userProfile.weight} kg`, margin + 10, yPosition + 34);
    doc.text(`BMI: ${idealParameters.bmi}`, margin + 10, yPosition + 44);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Calculated Ideal Parameters', margin + 80, yPosition + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Cadence: ${idealParameters.cadence} steps/min`, margin + 80, yPosition + 24);
    doc.text(`Walking Speed: ${idealParameters.walkingSpeed} m/s`, margin + 80, yPosition + 34);
    doc.text(`Stride Length: ${idealParameters.strideLength} m`, margin + 80, yPosition + 44);
    
    doc.text(`Knee Force: ${idealParameters.kneeForce} N`, margin + 145, yPosition + 24);
    doc.text(`Step Frequency: ${idealParameters.frequency} Hz`, margin + 145, yPosition + 34);
    doc.text(`Postural Sway: ${idealParameters.posturalSway} mm`, margin + 145, yPosition + 44);

    yPosition += 55;

    // ============ METRICS TABLE ============
    doc.setTextColor(...darkColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Biomechanical Metrics Comparison', margin, yPosition);
    yPosition += 8;

    // Prepare table data
    const tableData = metricsData.map(metric => {
      const deviation = metric.ideal !== 0 ? ((metric.actual - metric.ideal) / metric.ideal * 100).toFixed(1) : '0.0';
      const status = getComparisonStatus(metric.actual, metric.ideal).status;
      const statusText = status === 'optimal' ? '✓ Optimal' : status === 'above' ? '↑ Above' : '↓ Below';
      return [
        metric.parameter,
        metric.category,
        `${metric.actual} ${metric.unit}`,
        `${metric.ideal} ${metric.unit}`,
        `${parseFloat(deviation) > 0 ? '+' : ''}${deviation}%`,
        statusText
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Parameter', 'Category', 'Actual', 'Ideal', 'Deviation', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9,
        textColor: darkColor
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { halign: 'right', cellWidth: 28 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 22 },
        5: { halign: 'center', cellWidth: 25 }
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        // Color code the status column
        if (data.column.index === 5 && data.section === 'body') {
          const status = data.cell.raw as string;
          if (status.includes('Optimal')) {
            data.cell.styles.textColor = successColor;
          } else if (status.includes('Above')) {
            data.cell.styles.textColor = warningColor;
          } else if (status.includes('Below')) {
            data.cell.styles.textColor = [59, 130, 246]; // Blue
          }
        }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // ============ ISSUES IDENTIFIED ============
    checkPageBreak(60);
    
    doc.setTextColor(...darkColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Issues Identified', margin, yPosition);
    yPosition += 10;

    const issues = metricsData.filter(m => {
      const status = getComparisonStatus(m.actual, m.ideal).status;
      return status !== 'optimal';
    });

    if (issues.length === 0) {
      doc.setFillColor(...successColor);
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 20, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text('✓ All parameters are within optimal range!', margin + 10, yPosition + 13);
      yPosition += 30;
    } else {
      issues.forEach((metric, index) => {
        checkPageBreak(25);
        const status = getComparisonStatus(metric.actual, metric.ideal);
        const deviation = ((metric.actual - metric.ideal) / metric.ideal * 100).toFixed(1);
        const issueColor = status.status === 'above' ? warningColor : [59, 130, 246] as [number, number, number];
        
        doc.setFillColor(issueColor[0], issueColor[1], issueColor[2]);
        doc.circle(margin + 3, yPosition + 5, 2, 'F');
        
        doc.setTextColor(...darkColor);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${metric.parameter}`, margin + 10, yPosition + 7);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const issueText = status.status === 'above' 
          ? `Currently ${Math.abs(parseFloat(deviation))}% above ideal (${metric.actual} vs ${metric.ideal} ${metric.unit})`
          : `Currently ${Math.abs(parseFloat(deviation))}% below ideal (${metric.actual} vs ${metric.ideal} ${metric.unit})`;
        doc.text(issueText, margin + 10, yPosition + 15);
        
        yPosition += 22;
      });
    }

    yPosition += 10;

    // ============ RECOMMENDATIONS ============
    checkPageBreak(80);
    
    doc.setTextColor(...darkColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Personalized Recommendations', margin, yPosition);
    yPosition += 10;

    if (recommendations.length === 0) {
      doc.setFillColor(...successColor);
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 20, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text('✓ Great job! All metrics are optimal. Keep up the good work!', margin + 10, yPosition + 13);
      yPosition += 30;
    } else {
      recommendations.forEach((rec, index) => {
        checkPageBreak(35);
        
        const priorityColor = rec.priority === 'high' ? dangerColor : rec.priority === 'medium' ? warningColor : successColor;
        
        // Priority indicator
        doc.setFillColor(...priorityColor);
        doc.roundedRect(margin, yPosition, 4, 28, 1, 1, 'F');
        
        // Recommendation box
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(margin + 6, yPosition, pageWidth - 2 * margin - 6, 28, 3, 3, 'F');
        
        // Title
        doc.setTextColor(...darkColor);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(rec.title, margin + 12, yPosition + 10);
        
        // Priority badge
        doc.setFontSize(8);
        doc.setTextColor(...priorityColor);
        const priorityText = `[${rec.priority.toUpperCase()}]`;
        doc.text(priorityText, pageWidth - margin - doc.getTextWidth(priorityText) - 5, yPosition + 10);
        
        // Description
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(rec.description, pageWidth - 2 * margin - 25);
        doc.text(descLines[0], margin + 12, yPosition + 20);
        
        // Impact
        doc.setTextColor(...primaryColor);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Impact: ${rec.impact} ${rec.impactLabel}`, margin + 12, yPosition + 26);
        
        yPosition += 35;
      });
    }

    // ============ FOOTER ============
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      
      // Footer text
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Generated by Kinova - Biomechanical Analysis Platform', margin, pageHeight - 8);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 8);
    }

    // Save the PDF
    const fileName = `Kinova_Gait_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }, [metricsData, overallScore, optimalCount, mlClassification, mlGaitScore, recommendations, getComparisonStatus, getScoreLabel, userProfile, idealParameters]);

  // Loading state
  if (loading || mlLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <Brain className="w-5 h-5 text-primary/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-xl font-semibold text-foreground animate-pulse">
            Loading biomechanical data...
          </p>
          <p className="text-sm text-muted-foreground">
            Fetching real-time sensor data & ML insights from Firebase
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="p-4 rounded-full bg-destructive/10 w-fit mx-auto">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
          <p className="text-xl font-semibold text-destructive">
            Error loading data
          </p>
          <p className="text-sm text-muted-foreground">
            {error.message}
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // No data state
  if (!gaitData || gaitData.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="p-4 rounded-full bg-muted w-fit mx-auto">
            <Activity className="w-12 h-12 text-muted-foreground" />
          </div>
          <p className="text-xl font-semibold text-foreground">
            No gait data available
          </p>
          <p className="text-sm text-muted-foreground">
            Waiting for sensor data to arrive...
          </p>
          <LiveIndicator size="lg" className="justify-center" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/3 to-transparent rounded-full" />
      </div>

      <div className="relative container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Hero Header */}
        <div ref={headerRef} className="space-y-6">
          {/* Title Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg animate-pulse" />
                <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                  <BarChart3 className="w-7 h-7 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                  Biomechanical <span className="text-primary">Comparison</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Real-time metrics vs ideal values for optimal performance
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <LiveIndicator size="lg" />
              <Button variant="outline" className="border-border/50 hover:border-primary/50 hover:bg-primary/5">
                <Calendar className="w-4 h-4 mr-2" />
                Last {historicalData.length} Entries
              </Button>
              <Button 
                onClick={generatePDFReport}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>

          {/* Profile Prompt Modal - Can be dismissed, doesn't block content */}
          {showProfilePrompt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md">
              <div 
                className="absolute inset-0" 
                onClick={() => {
                  // Allow dismissing by clicking outside
                  setShowProfilePrompt(false);
                }}
              />
              <Card className="relative z-10 w-full max-w-md mx-4 border-primary/20 shadow-2xl shadow-primary/10">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-2">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Set Up Your Profile</CardTitle>
                  <CardDescription>
                    Enter your height and weight to get personalized ideal gait parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="height" className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-muted-foreground" />
                        Height (cm)
                      </Label>
                      <Input
                        id="height"
                        type="number"
                        min={100}
                        max={250}
                        value={tempProfile.height}
                        onChange={(e) => setTempProfile(prev => ({ ...prev, height: Number(e.target.value) }))}
                        className="bg-background"
                        placeholder="170"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight" className="flex items-center gap-2">
                        <Weight className="w-4 h-4 text-muted-foreground" />
                        Weight (kg)
                      </Label>
                      <Input
                        id="weight"
                        type="number"
                        min={30}
                        max={300}
                        value={tempProfile.weight}
                        onChange={(e) => setTempProfile(prev => ({ ...prev, weight: Number(e.target.value) }))}
                        className="bg-background"
                        placeholder="70"
                      />
                    </div>
                  </div>
                  
                  {/* Preview calculated values */}
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Preview of your personalized ideals:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">BMI:</span>
                        <span className="font-medium">{(tempProfile.weight / Math.pow(tempProfile.height / 100, 2)).toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cadence:</span>
                        <span className="font-medium">{Math.round(115 - (tempProfile.height - 170) * 0.15)} steps/min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Speed:</span>
                        <span className="font-medium">{((tempProfile.height * 0.53) / 100 * 0.95).toFixed(2)} m/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stride:</span>
                        <span className="font-medium">{(tempProfile.height * 0.43 / 100).toFixed(2)} m</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setShowProfilePrompt(false);
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Skip for Now
                    </Button>
                    <Button 
                      className="flex-1 bg-primary"
                      onClick={handleSaveProfile}
                      disabled={tempProfile.height < 100 || tempProfile.height > 250 || tempProfile.weight < 30 || tempProfile.weight > 300}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save & Continue
                    </Button>
                  </div>
                  <p className="text-xs text-center text-muted-foreground pt-2">
                    Using default values ({DEFAULT_PROFILE.height}cm, {DEFAULT_PROFILE.weight}kg) until you set your profile
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* User Profile Card */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <User className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      Your Profile
                      {isProfileSet && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                          Personalized
                        </Badge>
                      )}
                      {!isProfileSet && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                          Required
                        </Badge>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isProfileSet 
                        ? 'Ideal values calculated for your body measurements' 
                        : 'Set your height and weight to enable personalized comparisons'}
                    </p>
                  </div>
                </div>
                
                {isEditingProfile ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <Ruler className="w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min={100}
                          max={250}
                          value={tempProfile.height}
                          onChange={(e) => setTempProfile(prev => ({ ...prev, height: Number(e.target.value) }))}
                          className="w-20 h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">cm</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min={30}
                          max={300}
                          value={tempProfile.weight}
                          onChange={(e) => setTempProfile(prev => ({ ...prev, weight: Number(e.target.value) }))}
                          className="w-20 h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">kg</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="w-4 h-4" />
                      </Button>
                      <Button size="sm" onClick={handleSaveProfile} className="bg-primary">
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-6 px-4 py-2 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-foreground">{userProfile.height}</span>
                        <span className="text-xs text-muted-foreground">cm</span>
                      </div>
                      <div className="w-px h-6 bg-border" />
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-foreground">{userProfile.weight}</span>
                        <span className="text-xs text-muted-foreground">kg</span>
                      </div>
                      <div className="w-px h-6 bg-border" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">BMI</span>
                        <span className="font-semibold text-foreground">{idealParameters.bmi}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setTempProfile(userProfile);
                        setIsEditingProfile(true);
                      }}
                      className="border-border/50"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats - Always show, uses default profile if not set */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* ML Gait Score Card */}
            <div className={`hero-stat group relative overflow-hidden rounded-xl border ${getScoreColor(overallScore).border} bg-card/50 backdrop-blur-sm p-4 hover:border-primary/50 transition-all duration-300`}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    {mlGaitScore !== null ? 'ML Gait Score' : 'Gait Score'}
                  </span>
                  <div className={`p-1.5 rounded-lg ${getScoreColor(overallScore).bg}`}>
                    <Target className={`w-4 h-4 ${getScoreColor(overallScore).text}`} />
                  </div>
                </div>
                
                {/* Circular Score Indicator */}
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14">
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
                        stroke={getScoreColor(overallScore).ring}
                        strokeWidth="3"
                        strokeDasharray={`${overallScore}, 100`}
                        strokeLinecap="round"
                        className="drop-shadow-sm transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-lg font-bold ${getScoreColor(overallScore).text}`}>
                        {overallScore}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <Badge className={`${getScoreColor(overallScore).bg} ${getScoreColor(overallScore).text} border-0 text-[10px]`}>
                      {mlClassification || getScoreLabel(overallScore)}
                    </Badge>
                    {mlGaitScore !== null && (
                      <p className="text-[10px] text-muted-foreground mt-1">ML Powered</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="hero-stat group relative overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm p-4 hover:border-emerald-500/40 transition-all duration-300">
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-emerald-400/70 uppercase tracking-wider">Optimal</span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-emerald-400">{optimalCount}</span>
                  <span className="text-sm text-emerald-400/60">parameters</span>
                </div>
              </div>
            </div>

            <div className="hero-stat group relative overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-sm p-4 hover:border-amber-500/40 transition-all duration-300">
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-amber-400/70 uppercase tracking-wider">Above Ideal</span>
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-amber-400">{aboveCount}</span>
                  <span className="text-sm text-amber-400/60">parameters</span>
                </div>
              </div>
            </div>

            <div className="hero-stat group relative overflow-hidden rounded-xl border border-sky-500/20 bg-sky-500/5 backdrop-blur-sm p-4 hover:border-sky-500/40 transition-all duration-300">
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-sky-400/70 uppercase tracking-wider">Below Ideal</span>
                  <TrendingDown className="w-5 h-5 text-sky-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-sky-400">{belowCount}</span>
                  <span className="text-sm text-sky-400/60">parameters</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with Tabs - Always show, uses default profile if not set */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full sm:w-auto bg-card border border-border p-1.5 rounded-xl shadow-lg">
            <TabsTrigger 
              value="overview" 
              className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="metrics" 
              className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <Activity className="w-4 h-4 mr-2" />
              All Metrics
            </TabsTrigger>
            <TabsTrigger 
              value="trends" 
              className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Trends
            </TabsTrigger>
            <TabsTrigger 
              value="insights" 
              className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Insights
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Radar Chart */}
              <Card className="main-card lg:col-span-3 border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5" />
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Target className="w-4 h-4 text-primary" />
                        </div>
                        Performance Radar
                      </CardTitle>
                      <CardDescription>
                        Normalized comparison (ideal = 100%)
                      </CardDescription>
                    </div>
                    <LiveIndicator />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <ResponsiveContainer width="100%" height={380}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 500 }}
                      />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 150]} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        tickCount={4}
                      />
                      <Radar
                        name="Ideal"
                        dataKey="ideal"
                        stroke="hsl(var(--muted-foreground))"
                        fill="hsl(var(--muted))"
                        fillOpacity={0.2}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                      <Radar
                        name="Actual"
                        dataKey="actual"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          padding: '12px'
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Quick Metrics */}
              <div className="lg:col-span-2 space-y-4 min-h-[400px]">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Key Metrics (Live) • {metricsData.length} total
                </h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {metricsData.length === 0 ? (
                    <div className="p-4 rounded-xl border border-border/50 bg-card/50 text-center">
                      <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">No metrics data available</p>
                      <p className="text-muted-foreground text-xs mt-1">Waiting for sensor data...</p>
                    </div>
                  ) : (
                    metricsData.slice(0, 6).map((metric) => {
                      const comparison = getComparisonStatus(metric.actual, metric.ideal);
                      const MetricIcon = metric.icon;
                      const StatusIcon = comparison.icon;
                      const deviation = getDeviationPercent(metric.actual, metric.ideal);
                      const isHovered = hoveredMetric === metric.parameter;

                      return (
                        <div 
                          key={metric.parameter}
                          className={`metric-item group relative overflow-hidden rounded-xl border ${comparison.borderColor} ${comparison.bgColor} p-4 cursor-pointer transition-all duration-300 ${isHovered ? 'scale-[1.02] shadow-lg' : ''}`}
                          onMouseEnter={() => setHoveredMetric(metric.parameter)}
                          onMouseLeave={() => setHoveredMetric(null)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${comparison.bgColor}`}>
                                <MetricIcon className={`w-4 h-4 ${comparison.color}`} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-foreground text-sm">{metric.parameter}</h4>
                                <p className="text-xs text-muted-foreground">{metric.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-foreground">{metric.actual}</span>
                                <span className="text-xs text-muted-foreground">{metric.unit}</span>
                              </div>
                              <div className={`flex items-center gap-1 text-xs ${comparison.color}`}>
                                {parseFloat(deviation) > 0 ? '+' : ''}{deviation}%
                                <StatusIcon className="w-3 h-3" />
                              </div>
                            </div>
                          </div>
                          
                          {/* Expandable details */}
                          <div className={`mt-3 pt-3 border-t border-border/30 transition-all duration-300 ${isHovered ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Ideal: {metric.ideal} {metric.unit}</span>
                              <span className="text-muted-foreground">Related: {metric.relatedTo}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setActiveTab('metrics')}
                >
                  View All Metrics
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Correlations */}
            <Card className="main-card border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-500/10">
                    <Activity className="w-4 h-4 text-violet-400" />
                  </div>
                  Parameter Performance
                </CardTitle>
                <CardDescription>How each parameter compares to ideal values</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {correlationData.map((item, index) => (
                    <div 
                      key={index}
                      className="relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-4 group hover:border-primary/50 transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <p className="text-sm font-medium text-foreground mb-3">{item.pair}</p>
                        <div className="flex items-end justify-between">
                          <div className="flex-1 mr-4">
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-1000"
                                style={{ width: `${item.strength}%`, backgroundColor: item.color }}
                              />
                            </div>
                          </div>
                          <span className="text-2xl font-bold" style={{ color: item.color }}>{item.strength}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6 mt-0">
            {metricsData.length === 0 ? (
              <Card className="border-border/50 bg-card/80">
                <CardContent className="p-8 text-center">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No metrics data available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {metricsData.map((metric) => {
                  const comparison = getComparisonStatus(metric.actual, metric.ideal);
                  const MetricIcon = metric.icon;
                  const deviation = getDeviationPercent(metric.actual, metric.ideal);
                  const progressPercent = metric.ideal > 0 ? Math.min((metric.actual / metric.ideal) * 100, 150) : 0;

                  return (
                    <Card 
                      key={metric.parameter}
                      className="main-card group relative border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden transition-all duration-500 ease-out hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 hover:scale-[1.02] cursor-pointer"
                    >
                      {/* Animated background gradient on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      {/* Shine effect on hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                      </div>

                      <CardHeader className="relative pb-3 z-10">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${comparison.bgColor} transition-all duration-500 group-hover:scale-125 group-hover:rotate-6 group-hover:shadow-lg`}>
                              <MetricIcon className={`w-4 h-4 ${comparison.color} transition-transform duration-500 group-hover:scale-110`} />
                            </div>
                            <div>
                              <CardTitle className="text-base transition-colors duration-300 group-hover:text-foreground">{metric.parameter}</CardTitle>
                              <CardDescription className="text-xs transition-colors duration-300 group-hover:text-foreground/80">{metric.description}</CardDescription>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className={`${getCategoryStyle(metric.category)} border text-[10px] uppercase mt-2 w-fit transition-all duration-300 group-hover:scale-105`}>
                          {metric.category}
                        </Badge>
                      </CardHeader>
                      <CardContent className="relative space-y-4 z-10">
                        {/* Values */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-muted/30 border border-border/30 transition-all duration-300 group-hover:bg-muted/50 group-hover:border-border/50 group-hover:scale-105">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 transition-colors duration-300 group-hover:text-foreground/70">Actual</p>
                            <p className="text-xl font-bold text-foreground transition-all duration-300 group-hover:scale-110">
                              {metric.actual}
                              <span className="text-xs text-muted-foreground ml-1 transition-colors duration-300 group-hover:text-foreground/60">{metric.unit}</span>
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 transition-all duration-300 group-hover:bg-primary/10 group-hover:border-primary/40 group-hover:scale-105">
                            <p className="text-[10px] uppercase tracking-wider text-primary/70 mb-1 transition-colors duration-300 group-hover:text-primary">Ideal</p>
                            <p className="text-xl font-bold text-primary transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-lg">
                              {metric.ideal}
                              <span className="text-xs text-primary/70 ml-1 transition-colors duration-300 group-hover:text-primary">{metric.unit}</span>
                            </p>
                          </div>
                        </div>

                        {/* Progress */}
                        <div>
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-muted-foreground transition-colors duration-300 group-hover:text-foreground/80">Progress to Ideal</span>
                            <span className={`font-semibold ${comparison.color} transition-all duration-300 group-hover:scale-110`}>
                              {parseFloat(deviation) > 0 ? '+' : ''}{deviation}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden group-hover:h-2.5 transition-all duration-300">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700 group-hover:from-primary group-hover:to-primary/90"
                              style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/30">
                          <span className="text-xs text-muted-foreground transition-colors duration-300 group-hover:text-foreground/70">{metric.relatedTo}</span>
                          <Badge className={`${comparison.bgColor} ${comparison.color} border-0 text-xs transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                            {comparison.status === 'optimal' ? 'Optimal' : comparison.status === 'above' ? 'Above' : comparison.status === 'below' ? 'Below' : 'N/A'}
                          </Badge>
                        </div>
                      </CardContent>

                      {/* Border glow effect on hover */}
                      <div className={`absolute inset-0 rounded-lg border-2 ${comparison.borderColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="main-card border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    Equilibrium & Cadence
                  </CardTitle>
                  <CardDescription>Recent data trend ({historicalData.length} entries)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient id="equilibriumFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        domain={[0, 'auto']}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        }}
                      />
                      <Legend />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="equilibrium" 
                        stroke="hsl(var(--primary))" 
                        fill="url(#equilibriumFill)"
                        strokeWidth={2}
                        name="Equilibrium"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="cadence" 
                        stroke="hsl(142 76% 36%)" 
                        strokeWidth={2}
                        name="Cadence"
                        dot={{ fill: 'hsl(142 76% 36%)', strokeWidth: 0, r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="main-card border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10">
                      <Activity className="w-4 h-4 text-amber-400" />
                    </div>
                    Speed & Knee Force
                  </CardTitle>
                  <CardDescription>Track biomechanics over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient id="speedFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        }}
                      />
                      <Legend />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="speed" 
                        stroke="hsl(38 92% 50%)" 
                        fill="url(#speedFill)"
                        strokeWidth={2}
                        name="Speed (m/s)"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="kneeForce" 
                        stroke="hsl(260 100% 70%)" 
                        strokeWidth={2}
                        name="Knee Force (N)"
                        dot={{ fill: 'hsl(260 100% 70%)', strokeWidth: 0, r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6 mt-0">
            {/* Recommendations */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Personalized Recommendations</h2>
                  <p className="text-sm text-muted-foreground">Based on your real-time sensor data</p>
                </div>
              </div>

              {recommendations.length === 0 ? (
                <Card className="border-emerald-500/20 bg-emerald-500/5">
                  <CardContent className="p-6 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-lg font-semibold text-foreground">All parameters are optimal!</p>
                    <p className="text-sm text-muted-foreground">Keep up the great work maintaining your gait health.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.map((rec, index) => {
                    const Icon = rec.icon;
                    const priorityStyles = {
                      high: { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
                      medium: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400' },
                      low: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400' },
                    };
                    const style = priorityStyles[rec.priority as keyof typeof priorityStyles];

                    return (
                      <Card 
                        key={index}
                        className={`insight-card group relative border ${style.border} bg-card/80 backdrop-blur-sm overflow-hidden transition-all duration-500 ease-out hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 hover:scale-[1.02] cursor-pointer`}
                      >
                        {/* Animated background gradient on hover */}
                        <div className={`absolute inset-0 ${style.bg} opacity-30 transition-opacity duration-500 group-hover:opacity-50`} />
                        
                        {/* Shine effect on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                        </div>

                        <CardHeader className="relative pb-3 z-10">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2.5 rounded-xl ${style.bg} transition-all duration-500 group-hover:scale-125 group-hover:rotate-6 group-hover:shadow-lg`}>
                                <Icon className={`w-5 h-5 ${style.text} transition-transform duration-500 group-hover:scale-110`} />
                              </div>
                              <div className="flex-1">
                                <CardTitle className="text-base leading-tight transition-colors duration-300 group-hover:text-foreground">{rec.title}</CardTitle>
                                <Badge className={`${style.badge} border-0 text-[10px] uppercase mt-2 transition-all duration-300 group-hover:scale-105`}>
                                  {rec.priority} Priority
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className={`text-2xl font-bold ${style.text} transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-lg`}>{rec.impact}</div>
                              <div className="text-xs text-muted-foreground transition-colors duration-300 group-hover:text-foreground/70">{rec.impactLabel}</div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <p className="text-sm text-muted-foreground leading-relaxed transition-colors duration-300 group-hover:text-foreground/90">
                            {rec.description}
                          </p>
                        </CardContent>

                        {/* Border glow effect on hover */}
                        <div className={`absolute inset-0 rounded-lg border-2 ${style.border} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Key Insights */}
            <Card className="main-card border-sky-500/20 bg-gradient-to-br from-sky-500/5 via-card/80 to-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/10">
                    <Info className="w-4 h-4 text-sky-400" />
                  </div>
                  Analysis Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <h4 className="font-semibold text-foreground">Strengths ({optimalCount} optimal)</h4>
                    </div>
                    <ul className="space-y-3">
                      {metricsData
                        .filter(m => getComparisonStatus(m.actual, m.ideal).status === 'optimal')
                        .slice(0, 3)
                        .map((metric, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                            <span>{metric.parameter} is within optimal range ({metric.actual} {metric.unit})</span>
                          </li>
                        ))}
                      {optimalCount === 0 && (
                        <li className="text-sm text-muted-foreground italic">
                          Working towards optimal parameters...
                        </li>
                      )}
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                      <h4 className="font-semibold text-foreground">Areas for Improvement ({aboveCount + belowCount} parameters)</h4>
                    </div>
                    <ul className="space-y-3">
                      {metricsData
                        .filter(m => getComparisonStatus(m.actual, m.ideal).status !== 'optimal')
                        .slice(0, 3)
                        .map((metric, i) => {
                          const status = getComparisonStatus(metric.actual, metric.ideal);
                          const deviation = Math.abs(parseFloat(getDeviationPercent(metric.actual, metric.ideal)));
                          return (
                            <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                              <span>
                                {metric.parameter} is {deviation.toFixed(0)}% {status.status === 'above' ? 'above' : 'below'} ideal
                              </span>
                            </li>
                          );
                        })}
                      {aboveCount + belowCount === 0 && (
                        <li className="text-sm text-emerald-400">
                          All parameters are optimal! Great job!
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Comparison;

