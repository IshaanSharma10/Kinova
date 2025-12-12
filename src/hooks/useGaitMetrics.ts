import { useState, useEffect, useCallback } from 'react';
import { onValue, ref } from 'firebase/database';
import { database } from '@/Firebase/ifreConfig';

export interface GaitDataEntry {
  cadence?: number;
  equilibriumScore?: number;
  frequency?: number;
  gaitSymmetry?: number;
  kneeForce?: number;
  posturalSway?: number;
  pressureLeft?: number;
  pressureRight?: number;
  stepWidth?: number;
  steps?: number;
  strideLength?: number;
  timestamp?: number;
  walkingSpeed?: number;
  sensors?: any;
  _key?: string;
}

interface GaitMetricsState {
  data: GaitDataEntry[] | null;
  loading: boolean;
  error: Error | null;
}

export const useGaitMetrics = (): GaitMetricsState => {
  const [state, setState] = useState<GaitMetricsState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Query to get ALL entries from Firebase (no limit)
    const gaitDataRef = ref(database, 'gaitData');

    const unsubscribe = onValue(
      gaitDataRef,
      (snapshot) => {
        const rawData = snapshot.val();
        
        if (!rawData) {
          setState({ data: [], loading: false, error: null });
          return;
        }

        // Optimized: Get keys and filter in one pass, then sort
        const entryKeys = Object.keys(rawData)
          .filter(key => key.startsWith('-'))
          .sort((a, b) => b.localeCompare(a)); // Sort in place

        if (entryKeys.length === 0) {
          setState({ data: [], loading: false, error: null });
          return;
        }

        // Optimized: Map to data array with minimal processing
        const dataArray: GaitDataEntry[] = new Array(entryKeys.length);
        for (let i = 0; i < entryKeys.length; i++) {
          const key = entryKeys[i];
          const entry = rawData[key];
          dataArray[i] = {
            cadence: entry?.cadence,
            equilibriumScore: entry?.equilibriumScore,
            frequency: entry?.frequency,
            gaitSymmetry: entry?.gaitSymmetry,
            kneeForce: entry?.kneeForce,
            posturalSway: entry?.posturalSway,
            pressureLeft: entry?.pressureLeft,
            pressureRight: entry?.pressureRight,
            stepWidth: entry?.stepWidth,
            steps: entry?.steps,
            strideLength: entry?.strideLength,
            timestamp: entry?.timestamp,
            walkingSpeed: entry?.walkingSpeed,
            sensors: entry?.sensors,
            _key: key
          };
        }
        
        // Single state update for better performance
        setState({ 
          data: dataArray, 
          loading: false, 
          error: null 
        });
      },
      (error) => {
        console.error("Firebase error:", error);
        setState({ data: null, loading: false, error });
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return state;
};