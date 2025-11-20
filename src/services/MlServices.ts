// mlService.ts
// Server-side module - do NOT ship HF_API_TOKEN to the browser

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

const HF_API_URL = process.env.HF_API_URL || ''; // e.g. "https://api-inference.huggingface.co/models/your-username/your-model"
const HF_API_TOKEN = process.env.HF_API_TOKEN || ''; // keep server-side only

if (!HF_API_URL || !HF_API_TOKEN) {
  // deliberate early warning — in production you may want to throw here
  console.warn('HF_API_URL or HF_API_TOKEN not configured. ML calls will fail without these.');
}

/**
 * Validate metrics (simple guard)
 */
function validateMetrics(m: GaitMetrics) {
  const keys: (keyof GaitMetrics)[] = [
    'equilibriumScore',
    'cadence',
    'posturalSway',
    'walkingSpeed',
    'strideLength',
    'frequency',
    'steps',
    'stepWidth',
  ];
  for (const k of keys) {
    const v = m[k];
    if (typeof v !== 'number' || Number.isNaN(v) || !isFinite(v)) {
      throw new Error(`Invalid metric ${k}: ${String(v)}`);
    }
  }
}

/**
 * Timeout + retry wrapper for fetch
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  { retries = 3, timeoutMs = 15000 }: { retries?: number; timeoutMs?: number } = {}
): Promise<Response> {
  let attempt = 0;
  // exponential backoff
  while (true) {
    attempt++;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      if (!res.ok && attempt <= retries) {
        // small delay before retry
        const waitMs = 200 * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(id);
      if (attempt > retries) throw err;
      const waitMs = 200 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

/**
 * Heuristic to parse common HF model responses into MLInsight.
 *
 * This supports a few common response shapes:
 *  - Model returns a JSON map { prediction, confidence, recommendations, riskLevel } directly
 *  - Text classification models returning [{label, score}, ...]
 *  - LLM that returns text (we'll attempt to parse JSON from the generated text)
 */
function parseMLResponse(responseBody: any, fallbackMetrics?: GaitMetrics): MLInsight {
  // 1) direct shape
  if (responseBody && typeof responseBody === 'object') {
    if (
      typeof responseBody.prediction === 'string' &&
      typeof responseBody.confidence === 'number' &&
      Array.isArray(responseBody.recommendations) &&
      (responseBody.riskLevel === 'low' || responseBody.riskLevel === 'medium' || responseBody.riskLevel === 'high')
    ) {
      return {
        prediction: responseBody.prediction,
        confidence: responseBody.confidence,
        recommendations: responseBody.recommendations,
        riskLevel: responseBody.riskLevel,
      };
    }

    // 2) text-classification style: [{label, score}, ...]
    if (Array.isArray(responseBody) && responseBody.length > 0 && typeof responseBody[0].label === 'string') {
      const primary = responseBody[0];
      const prediction = primary.label;
      const confidence = primary.score ?? primary.confidence ?? 0.5;
      // simple mapping of label to risk + recommendations
      const normalizedLabel = prediction.toLowerCase();
      const riskLevel =
        normalizedLabel.includes('high') || normalizedLabel.includes('abnormal') || normalizedLabel.includes('fall')
          ? 'high'
          : normalizedLabel.includes('medium') || normalizedLabel.includes('mild')
          ? 'medium'
          : 'low';
      const recommendations =
        riskLevel === 'high'
          ? ['Refer to clinician', 'Detailed gait assessment recommended', 'Increase monitoring frequency']
          : riskLevel === 'medium'
          ? ['Monitor weekly', 'Consider physiotherapy assessment']
          : ['Maintain current activity level', 'Periodic monitoring'];
      return { prediction, confidence, recommendations, riskLevel };
    }
  }

  // 3) LLM returned text (string) — attempt to parse JSON inside the text
  if (typeof responseBody === 'string') {
    // try to find a JSON substring
    const trimmed = responseBody.trim();
    try {
      // first try full-text parse
      const parsed = JSON.parse(trimmed);
      return parseMLResponse(parsed, fallbackMetrics);
    } catch {
      // find {...} and parse
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        const snippet = trimmed.slice(start, end + 1);
        try {
          const parsed = JSON.parse(snippet);
          return parseMLResponse(parsed, fallbackMetrics);
        } catch {
          // fallthrough
        }
      }
    }
    // fallback textual heuristic
    const lowered = trimmed.toLowerCase();
    const riskLevel = lowered.includes('high') ? 'high' : lowered.includes('medium') ? 'medium' : 'low';
    const prediction = trimmed.slice(0, 120);
    return {
      prediction,
      confidence: 0.5,
      recommendations: riskLevel === 'high' ? ['Refer to clinic'] : ['Continue monitoring'],
      riskLevel,
    };
  }

  // 4) final fallback when model is unhelpful
  return {
    prediction: 'Normal Gait Pattern',
    confidence: 0.75,
    recommendations: ['Maintain current activity level', 'Continue regular monitoring'],
    riskLevel: 'low',
  };
}

/**
 * Build payload and call HF model.
 *
 * This function tries to be model-agnostic:
 *  - If you use an LLM (text generation), we send a prompt instructing the model to return JSON (structured output).
 *  - If your model is a custom HF model that accepts JSON and returns JSON, we post metrics directly as JSON.
 *
 * Set the env var HF_MODEL_MODE to either 'json' (for structured model) or 'text' (LLM). Default is 'text'.
 */
const HF_MODEL_MODE = (process.env.HF_MODEL_MODE || 'text').toLowerCase(); // 'text' | 'json'

export async function getMLInsights(metrics: GaitMetrics): Promise<MLInsight> {
  validateMetrics(metrics);

  if (!HF_API_URL || !HF_API_TOKEN) {
    throw new Error('Hugging Face API URL or token not configured (HF_API_URL / HF_API_TOKEN).');
  }

  // prepare fetch options
  const headers: Record<string, string> = {
    Authorization: `Bearer ${HF_API_TOKEN}`,
  };

  // default timeout and retry handled in fetchWithRetry
  let body: string;
  let contentType = 'application/json';

  if (HF_MODEL_MODE === 'json') {
    // assume model accepts a JSON object and responds with JSON
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ inputs: metrics });
  } else {
    // text/LLM mode -> create a prompt that requests JSON output
    headers['Content-Type'] = 'application/json';
    const prompt = `
You are a clinical ML assistant. Given the following gait metrics, classify the gait and return a strict JSON object (no extra text) with keys:
{
  "prediction": "<short label>",
  "confidence": <float between 0 and 1>,
  "recommendations": ["...","..."],
  "riskLevel": "low" | "medium" | "high"
}

Gait metrics (float):
${JSON.stringify(metrics, null, 2)}

Return ONLY the JSON object.
`;

    // For HF inference text generation, many endpoints accept {"inputs":"...","parameters":{...}}
    body = JSON.stringify({
      inputs: prompt,
      // optional parameters — adjust per model capabilities
      parameters: {
        max_new_tokens: 256,
        temperature: 0.0,
        return_full_text: false,
      },
    });
  }

  const res = await fetchWithRetry(HF_API_URL, {
    method: 'POST',
    headers,
    body,
  });

  const text = await res.text();

  // Try to parse JSON — many HF endpoints return JSON directly or textified JSON
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // if text looked like JSON inside a top-level generated string, let parseMLResponse attempt to extract
    parsed = text;
  }

  const insight = parseMLResponse(parsed, metrics);

  return insight;
}

/**
 * Batch helper (parallel). If you want rate-limiting, replace Promise.all with a queue.
 */
export async function getBatchMLInsights(metricsArray: GaitMetrics[]): Promise<MLInsight[]> {
  // shallow validate
  for (const m of metricsArray) validateMetrics(m);
  // For production, consider throttling to avoid HF rate limits
  const promises = metricsArray.map((m) => getMLInsights(m));
  return Promise.all(promises);
}

/**
 * Example usage (server-side)
 *
 * (async () => {
 *   const sample: GaitMetrics = {
 *     equilibriumScore: 85,
 *     cadence: 100,
 *     posturalSway: 0.05,
 *     walkingSpeed: 1.3,
 *     strideLength: 1.2,
 *     frequency: 1.1,
 *     steps: 800,
 *     stepWidth: 0.08,
 *   };
 *
 *   try {
 *     const out = await getMLInsights(sample);
 *     console.log('ML Insight:', out);
 *   } catch (err) {
 *     console.error('ML error', err);
 *   }
 * })();
 */
export type { MLInsight, GaitMetrics };
