import { useState, useEffect } from 'react';
import { onValue, ref } from 'firebase/database';
import { database } from '@/Firebase/ifreConfig';

export interface GaitDataEntry {
  cadence?: number;
  equilibriumScore?: number;
  frequency?: number;
  kneeForce?: number;
  posturalSway?: number;
  stepWidth?: number;
  steps?: number;
  strideLength?: number;
  timestamp?: number;
  walkingSpeed?: number;
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
  console.log('🔥 Setting up Firebase listener...');
  
  // REMOVE the 'average_scores' node - we want individual entries
  const gaitDataRef = ref(database, 'gaitData');

  const unsubscribe = onValue(
    gaitDataRef,
    (snapshot) => {
      console.log('📡 Firebase snapshot received');
      const rawData = snapshot.val();
      
      console.log('🔍 Raw data:', rawData);
      
      if (!rawData) {
        console.error('❌ No data in Firebase!');
        setState({ data: [], loading: false, error: null });
        return;
      }

      // Filter out the 'average_scores' key and only get actual gait entries
      const entries = Object.entries(rawData).filter(([key]) => {
        // Only include keys that start with '-' (Firebase push IDs)
        return key.startsWith('-');
      });
      
      console.log('📝 Filtered entries:', entries.length);
      
      const dataArray: GaitDataEntry[] = entries.map(([key, value]: [string, any]) => {
        console.log(`🔑 Processing key: ${key}`, value);
        return {
          ...value,
          _key: key
        };
      });

      // Sort by key (newest first)
      dataArray.sort((a, b) => {
        return (b._key || '').localeCompare(a._key || '');
      });

      console.log('✅ Final data array:', dataArray);
      console.log('✅ Latest entry:', dataArray[0]);
      
      setState({ 
        data: dataArray, 
        loading: false, 
        error: null 
      });
    },
    (error) => {
      console.error("❌ Firebase error:", error);
      setState({ data: null, loading: false, error });
    }
  );

  return () => {
    console.log('🧹 Cleaning up Firebase listener');
    unsubscribe();
  };
}, []);

  return state;
};