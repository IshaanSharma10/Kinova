/**
 * API Configuration
 * Configured to use localhost backend
 */

// Localhost API URL
const LOCALHOST_API_URL = 'http://localhost:8000';

/**
 * Get the full API endpoint URL
 * @param endpoint - API endpoint path (e.g., 'process-frame', 'chatbot')
 * @returns Full URL to the API endpoint
 */
export const getApiEndpoint = (endpoint: string): string => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${LOCALHOST_API_URL}/${cleanEndpoint}`;
};

/**
 * Fetch API endpoint (uses localhost)
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 * @returns Response from API
 */
export const fetchWithFallback = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = getApiEndpoint(endpoint);
  return fetch(url, options);
};

