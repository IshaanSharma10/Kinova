import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, X, TrendingUp, TrendingDown, Activity, Target, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGaitMetrics, GaitDataEntry } from '@/hooks/useGaitMetrics';
import { useMLInsightsFromFirebase } from '@/hooks/useMLInsightsFromFirebase';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'alert';
  title: string;
  message: string;
  time: string;
  read: boolean;
  timestamp: number;
  actionUrl?: string;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'alert':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
};

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastGaitScore, setLastGaitScore] = useState<number | null>(null);
  const [lastDataTimestamp, setLastDataTimestamp] = useState<number | null>(null);
  const { data: gaitData } = useGaitMetrics();
  const { data: mlData } = useMLInsightsFromFirebase('/gaitData/average_scores');
  const { userProfile } = useAuth();

  // Generate notifications based on real-time data
  useEffect(() => {
    if (!gaitData || gaitData.length === 0) return;

    const latestEntry = gaitData[0];
    const newNotifications: Notification[] = [];

    // Check for new data entry
    if (latestEntry.timestamp && latestEntry.timestamp !== lastDataTimestamp) {
      newNotifications.push({
        id: `new-data-${latestEntry.timestamp}`,
        type: 'info',
        title: 'New Gait Data Received',
        message: `Latest gait analysis data has been recorded. ${latestEntry.steps ? `${latestEntry.steps} steps detected.` : ''}`,
        time: formatTimeAgo(latestEntry.timestamp),
        read: false,
        timestamp: latestEntry.timestamp,
        actionUrl: '/analytics',
      });
      setLastDataTimestamp(latestEntry.timestamp);
    }

    // Check for gait score changes
    const currentScore = mlData?.gaitScoreDeterministic ?? mlData?.avgGaitScoreLast20;
    if (currentScore !== undefined && lastGaitScore !== null && currentScore !== lastGaitScore) {
      const scoreDiff = currentScore - lastGaitScore;
      const isImprovement = scoreDiff > 0;
      
      newNotifications.push({
        id: `score-change-${Date.now()}`,
        type: isImprovement ? 'success' : 'warning',
        title: isImprovement ? 'Gait Score Improved!' : 'Gait Score Decreased',
        message: `Your gait score changed from ${lastGaitScore.toFixed(0)} to ${currentScore.toFixed(0)} (${isImprovement ? '+' : ''}${scoreDiff.toFixed(0)} points).`,
        time: 'Just now',
        read: false,
        timestamp: Date.now(),
        actionUrl: '/insights',
      });
    }
    if (currentScore !== undefined) {
      setLastGaitScore(currentScore);
    }

    // Check for parameter alerts
    if (latestEntry) {
      // Cadence alert
      if (latestEntry.cadence !== undefined) {
        if (latestEntry.cadence < 80) {
          newNotifications.push({
            id: `cadence-low-${Date.now()}`,
            type: 'warning',
            title: 'Low Cadence Detected',
            message: `Your cadence is ${latestEntry.cadence.toFixed(0)} steps/min, which is below the optimal range (100-120).`,
            time: formatTimeAgo(latestEntry.timestamp || Date.now()),
            read: false,
            timestamp: latestEntry.timestamp || Date.now(),
            actionUrl: '/comparison',
          });
        } else if (latestEntry.cadence > 135) {
          newNotifications.push({
            id: `cadence-high-${Date.now()}`,
            type: 'warning',
            title: 'High Cadence Detected',
            message: `Your cadence is ${latestEntry.cadence.toFixed(0)} steps/min, which is above the optimal range (100-120).`,
            time: formatTimeAgo(latestEntry.timestamp || Date.now()),
            read: false,
            timestamp: latestEntry.timestamp || Date.now(),
            actionUrl: '/comparison',
          });
        }
      }

      // Equilibrium alert
      if (latestEntry.equilibriumScore !== undefined && latestEntry.equilibriumScore < 0.80) {
        newNotifications.push({
          id: `equilibrium-low-${Date.now()}`,
          type: 'alert',
          title: 'Balance Score Low',
          message: `Your equilibrium score is ${(latestEntry.equilibriumScore * 100).toFixed(0)}%, indicating potential balance issues.`,
          time: formatTimeAgo(latestEntry.timestamp || Date.now()),
          read: false,
          timestamp: latestEntry.timestamp || Date.now(),
          actionUrl: '/comparison',
        });
      }

      // Postural sway alert
      if (latestEntry.posturalSway !== undefined && latestEntry.posturalSway > 1.0) {
        newNotifications.push({
          id: `sway-high-${Date.now()}`,
          type: 'warning',
          title: 'Elevated Postural Sway',
          message: `Your postural sway is ${latestEntry.posturalSway.toFixed(2)}°, above the optimal range (0-1°).`,
          time: formatTimeAgo(latestEntry.timestamp || Date.now()),
          read: false,
          timestamp: latestEntry.timestamp || Date.now(),
          actionUrl: '/comparison',
        });
      }

      // Walking speed alert
      if (latestEntry.walkingSpeed !== undefined && latestEntry.walkingSpeed < 1.0) {
        newNotifications.push({
          id: `speed-low-${Date.now()}`,
          type: 'info',
          title: 'Walking Speed Below Average',
          message: `Your walking speed is ${latestEntry.walkingSpeed.toFixed(2)} m/s. Consider exercises to improve mobility.`,
          time: formatTimeAgo(latestEntry.timestamp || Date.now()),
          read: false,
          timestamp: latestEntry.timestamp || Date.now(),
          actionUrl: '/comparison',
        });
      }
    }

    // Check for ML recommendations
    if (mlData?.mlRecommendations && mlData.mlRecommendations.length > 0) {
      mlData.mlRecommendations.slice(0, 1).forEach((rec, index) => {
        newNotifications.push({
          id: `ml-recommendation-${Date.now()}-${index}`,
          type: 'info',
          title: 'New Recommendation',
          message: rec,
          time: 'Just now',
          read: false,
          timestamp: Date.now(),
          actionUrl: '/insights',
        });
      });
    }

    // Profile completion reminder (only add once)
    if (!userProfile?.height || !userProfile?.weight) {
      newNotifications.push({
        id: 'profile-reminder',
        type: 'info',
        title: 'Complete Your Profile',
        message: 'Set your height and weight to get personalized gait parameter recommendations.',
        time: 'Ongoing',
        read: false,
        timestamp: Date.now(),
        actionUrl: '/comparison',
      });
    }

    // Add new notifications to the list (avoid duplicates)
    if (newNotifications.length > 0) {
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));
        
        // Combine and sort by timestamp (newest first)
        const combined = [...uniqueNew, ...prev];
        combined.sort((a, b) => b.timestamp - a.timestamp);
        
        // Keep only last 20 notifications
        return combined.slice(0, 20);
      });
    }
  }, [gaitData, mlData, lastGaitScore, lastDataTimestamp, userProfile]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notifications</h4>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <>
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} new
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={markAllAsRead}
                  >
                    Mark all read
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        <ScrollArea className="h-80">
          <div className="p-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex gap-3 p-3 rounded-lg mb-2 transition-colors hover:bg-muted/50 cursor-pointer ${
                    !notification.read ? 'bg-primary/5 border-l-2 border-primary' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.actionUrl) {
                      window.location.href = notification.actionUrl;
                    }
                  }}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium truncate">
                        {notification.title}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-2 opacity-60 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.time}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="border-t border-border p-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => {
                // Could navigate to a full notifications page
                console.log('View all notifications');
              }}
            >
              View All Notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
