/**
 * API Client
 * Centralized HTTP client with offline queuing and error handling
 */

import { enqueue, setupOnlineFlush } from '../../core/offline/queue';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor() {
    // Use window.location for client-side, fallback to process.env for server-side
    this.baseUrl = (typeof window !== 'undefined' && (window as any).VITE_API_BASE_URL) || 
                   (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env?.VITE_API_BASE_URL) ||
                   `${window.location.protocol}//${window.location.host}`;
    this.timeout = 30000; // 30 seconds timeout
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Setup automatic replay on reconnect
    if (typeof window !== 'undefined') {
      setupOnlineFlush(this.baseUrl);
    }
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      // Handle non-JSON responses
      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          error: data?.message || data || `HTTP ${response.status}: ${response.statusText}`,
          data: data,
        };
      }

      return {
        success: true,
        data: data?.data || data,
        message: data?.message,
      };
    } catch (error) {
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout - please try again',
          };
        }
        
        if (error.message.includes('Failed to fetch')) {
          // If offline, queue the request
          if (!navigator.onLine && options.method && options.method !== 'GET') {
            await enqueue({
              endpoint,
              method: options.method,
              body: options.body ? JSON.parse(options.body as string) : undefined,
            });

            return {
              success: true,
              data: { queued: true } as T,
              message: 'Request queued for offline processing',
            };
          }
          
          return {
            success: false,
            error: 'Network error - please check your connection',
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.makeRequest<T>(url.pathname + url.search, {
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'DELETE',
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Singleton instance
export const apiClient = new ApiClient();
