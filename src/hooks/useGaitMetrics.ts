import { useState, useEffect } from 'react';
import { onValue, ref, query, limitToLast } from 'firebase/database';
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
    console.log('🔥 Firebase listener initialized - fetching latest entry');
    
    // Query to get only the last entry (most recent push key)
    const gaitDataRef = ref(database, 'gaitData');
    const latestQuery = query(gaitDataRef, limitToLast(10)); // Get last 10 for display

    const unsubscribe = onValue(
      latestQuery,
      (snapshot) => {
        const rawData = snapshot.val();
        
        console.log('\n📡 RAW FIREBASE DATA (last 10 entries):');
        console.log(JSON.stringify(rawData, null, 2));
        
        if (!rawData) {
          console.error('❌ No data in Firebase!');
          setState({ data: [], loading: false, error: null });
          return;
        }

        // Get ALL keys
        const allKeys = Object.keys(rawData);
        console.log('\n🔑 ALL KEYS:', allKeys);

        // Filter for entry keys (those starting with '-')
        const entryKeys = allKeys.filter(key => key.startsWith('-'));
        console.log('✅ ENTRY KEYS:', entryKeys);
        console.log('📊 TOTAL:', entryKeys.length);

        if (entryKeys.length === 0) {
          console.warn('⚠️ No valid entry keys!');
          setState({ data: [], loading: false, error: null });
          return;
        }

        // Sort keys alphabetically (Firebase push IDs are time-ordered)
        // Bigger key = newer entry
        entryKeys.sort((a, b) => b.localeCompare(a));
        
        console.log('\n📋 SORTED KEYS (newest first):');
        entryKeys.forEach((key, idx) => {
          console.log(`  [${idx}] ${key}`);
        });

        // Map to data array
        const dataArray: GaitDataEntry[] = entryKeys.map(key => {
          const entry = rawData[key];
          
          console.log(`\n📦 Processing: ${key}`);
          console.log('   Data:', JSON.stringify(entry, null, 2));
          
          return {
            cadence: entry.cadence,
            equilibriumScore: entry.equilibriumScore,
            frequency: entry.frequency,
            kneeForce: entry.kneeForce,
            posturalSway: entry.posturalSway,
            stepWidth: entry.stepWidth,
            steps: entry.steps,
            strideLength: entry.strideLength,
            timestamp: entry.timestamp,
            walkingSpeed: entry.walkingSpeed,
            sensors: entry.sensors,
            _key: key
          };
        });

        const latest = dataArray[0];
        console.log('\n✅ LATEST ENTRY SELECTED:');
        console.log(`   Key: ${latest._key}`);
        console.log(`   Timestamp: ${latest.timestamp}`);
        console.log(`   Cadence: ${latest.cadence}`);
        console.log(`   Equilibrium: ${latest.equilibriumScore}`);
        console.log(`   Walking Speed: ${latest.walkingSpeed}`);
        console.log(`   Postural Sway: ${latest.posturalSway}`);
        console.log(`   Steps: ${latest.steps}`);
        console.log(`   Frequency: ${latest.frequency}`);
        console.log(`   Knee Force: ${latest.kneeForce}`);
        console.log(`   Step Width: ${latest.stepWidth}`);
        console.log(`   Stride Length: ${latest.strideLength}`);
        
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