export function getApiBaseUrl(): string {
  const env = (import.meta as any).env?.VITE_API_BASE_URL?.toString().trim();
  if (env) return env.replace(/\/+$/, '');
  return window.location.origin;
}

/**
 * API utility functions
 */

// removed duplicate getApiBaseUrl

export const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  return fetch(url, { ...defaultOptions, ...options });
};



