import { useState, useEffect } from 'react';
import { onValue, ref } from 'firebase/database';
import { database } from '@/Firebase/ifreConfig';
import { GaitData, GaitDataEntry } from '@/types';

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
    // Reference to the 'gaitData' node in your Firebase Realtime Database
    const gaitDataRef = ref(database, 'gaitData');

    // Attach a listener to the 'gaitData' node
    const unsubscribe = onValue(
      gaitDataRef,
      (snapshot) => {
        const data = snapshot.val() as GaitData;
        
        // Convert the object of gait data entries into an array
        // We do this to easily map over the data in the React component
        const dataArray: GaitDataEntry[] = data ? Object.values(data) : [];

        // Sort the data by timestamp in descending order to show the latest entry first
        dataArray.sort((a, b) => b.timestamp - a.timestamp);

        setState({ data: dataArray, loading: false, error: null });
      },
      (error) => {
        setState({ data: null, loading: false, error });
        console.error("Firebase read failed:", error);
      }
    );

    // Cleanup function to detach the listener when the component unmounts
    return () => {
      unsubscribe();
    };
  }, []);

  return state;
};