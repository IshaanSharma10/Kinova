import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { database } from '@/Firebase/ifreConfig';

export interface MLFirebaseInsights {
  avgGaitScoreLast20?: number;
  avgClassificationLast20?: string;
  gaitScoreDeterministic?: number;  // From average_scores node
  gaitScoreClassification?: string;  // From average_scores node
  // optional fields your inference may write later:
  mlPrediction?: string;
  mlConfidence?: number;           // 0-1
  mlRecommendations?: string[];    // array of strings
  updatedAt?: string;
}

export function useMLInsightsFromFirebase(nodePath = '/gaitData/average_scores') {
  const [data, setData] = useState<MLFirebaseInsights | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const nodeRef = ref(database, nodePath);
      const unsub = onValue(nodeRef, (snapshot) => {
        const val = snapshot.val();
        if (!val) {
          setData(null);
          setLoading(false);
          return;
        }

        // Normalize shape - support both old and future fields
        const normalized: MLFirebaseInsights = {
          // Primary: gaitScoreDeterministic from average_scores node
          gaitScoreDeterministic: typeof val.gaitScoreDeterministic === 'number' ? val.gaitScoreDeterministic : undefined,
          gaitScoreClassification: typeof val.gaitScoreClassification === 'string' ? val.gaitScoreClassification : undefined,
          // Fallback: old field names
          avgGaitScoreLast20: val.avgGaitScoreLast20 ?? val.avgGaitScore ?? val.gaitScoreDeterministic ?? undefined,
          avgClassificationLast20: val.avgClassificationLast20 ?? val.avgClassification ?? val.gaitScoreClassification ?? undefined,
          mlPrediction: val.prediction ?? val.mlPrediction ?? undefined,
          mlConfidence: typeof val.confidence === 'number' ? val.confidence : undefined,
          mlRecommendations: Array.isArray(val.recommendations) ? val.recommendations : undefined,
          updatedAt: val.updatedAt ?? new Date().toISOString(),
        };

        setData(normalized);
        setLoading(false);
      }, (err) => {
        setError(err);
        setLoading(false);
      });

      return () => unsub();
    } catch (err: any) {
      setError(err);
      setLoading(false);
    }
  }, [nodePath]);

  return { data, loading, error };
}
