export function getApiBaseUrl(): string {
  const env = (import.meta as any).env?.VITE_API_BASE_URL?.toString().trim();
  if (env) return env.replace(/\/+$/, '');
  return window.location.origin;
}

// Type declaration for RequestInit
type RequestInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  mode?: string;
  credentials?: string;
  cache?: string;
  redirect?: string;
  referrer?: string;
  referrerPolicy?: string;
  integrity?: string;
  keepalive?: boolean;
  signal?: AbortSignal;
};

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

  // Merge options properly to avoid cache type conflicts
  const mergedOptions: RequestInit = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  return fetch(url, mergedOptions as any);
};



