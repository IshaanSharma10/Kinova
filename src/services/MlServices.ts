// ML Service to interact with Hugging Face model
interface MLInsight {
  prediction: string;
  confidence: number;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface GaitMetrics {
  equilibriumScore: number;
  cadence: number;
  posturalSway: number;
  walkingSpeed: number;
  strideLength: number;
  frequency: number;
  steps: number;
  stepWidth: number;
}

export async function getMLInsights(metrics: GaitMetrics): Promise<MLInsight> {
  try {
    // Replace with your actual Hugging Face model endpoint
    const HF_API_URL = 'YOUR_HUGGING_FACE_MODEL_URL';
    const HF_API_TOKEN = 'YOUR_HUGGING_FACE_API_TOKEN'; // Store in env variable

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          equilibriumScore: metrics.equilibriumScore,
          cadence: metrics.cadence,
          posturalSway: metrics.posturalSway,
          walkingSpeed: metrics.walkingSpeed,
          strideLength: metrics.strideLength,
          frequency: metrics.frequency,
          steps: metrics.steps,
          stepWidth: metrics.stepWidth,
        }
      }),
    });

    if (!response.ok) {
      throw new Error('ML model API request failed');
    }

    const result = await response.json();
    
    // Parse the model response - adjust based on your model's output format
    return parseMLResponse(result);
  } catch (error) {
    console.error('Error calling ML model:', error);
    throw error;
  }
}

function parseMLResponse(response: any): MLInsight {
  // Adjust this based on your model's actual response format
  // This is a placeholder structure
  return {
    prediction: response.prediction || 'Normal Gait Pattern',
    confidence: response.confidence || 0.85,
    recommendations: response.recommendations || [
      'Maintain current activity level',
      'Continue regular monitoring'
    ],
    riskLevel: response.riskLevel || 'low'
  };
}

// Batch analysis for multiple data points
export async function getBatchMLInsights(metricsArray: GaitMetrics[]): Promise<MLInsight[]> {
  try {
    const promises = metricsArray.map(metrics => getMLInsights(metrics));
    return await Promise.all(promises);
  } catch (error) {
    console.error('Error in batch ML analysis:', error);
    throw error;
  }
}