/**
 * API Service with Timezone Support
 * Handles API calls with timezone headers and UTC conversion
 */

import { useTimezoneHeaders } from '@/hooks/useTimezone';
import { localToUTC, utcToLocal, formatLocalTime } from '@/utils/dateUtils';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  _timezone?: {
    timezone: string;
    offset: number;
    offsetString: string;
  };
}

export class ApiService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get timezone headers for API calls
   */
  private getTimezoneHeaders(): Record<string, string> {
    // This would typically come from a context or hook
    // For now, we'll use browser timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = -new Date().getTimezoneOffset();
    const offsetString = this.formatOffset(offset);
    
    return {
      'X-Timezone': timezone,
      'X-Timezone-Offset': offsetString
    };
  }

  /**
   * Format offset in minutes to string format
   */
  private formatOffset(offsetMinutes: number): string {
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absOffset = Math.abs(offsetMinutes);
    const hours = Math.floor(absOffset / 60);
    const minutes = absOffset % 60;
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Convert local date range to UTC for API calls
   */
  private convertDateRangeToUTC(startDate: string, endDate: string): { startUTC: string; endUTC: string } {
    return {
      startUTC: localToUTC(startDate),
      endUTC: localToUTC(endDate)
    };
  }

  /**
   * Convert API response timestamps to local time
   */
  private convertTimestampsToLocal<T>(data: T): T {
    if (Array.isArray(data)) {
      return data.map(item => this.convertTimestampsToLocal(item)) as T;
    }
    
    if (data && typeof data === 'object') {
      const result = { ...data } as any;
      
      // Convert common timestamp fields
      const timestampFields = ['created_at', 'updated_at', 'sale_date', 'createdAt', 'updatedAt'];
      timestampFields.forEach(field => {
        if (result[field]) {
          result[`${field}_local`] = formatLocalTime(result[field]);
        }
      });
      
      return result;
    }
    
    return data;
  }

  /**
   * Make API request with timezone support
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...this.defaultHeaders,
      ...this.getTimezoneHeaders(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Request failed',
          message: data.message
        };
      }

      // Convert timestamps to local time
      const convertedData = this.convertTimestampsToLocal(data);

      return {
        success: true,
        data: convertedData,
        _timezone: data._timezone
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      // Convert date range parameters to UTC
      if (params.startDate && params.endDate) {
        const { startUTC, endUTC } = this.convertDateRangeToUTC(params.startDate, params.endDate);
        url.searchParams.set('start', startUTC);
        url.searchParams.set('end', endUTC);
      } else {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
          }
        });
      }
    }

    return this.request<T>(url.pathname + url.search);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Create default instance
export const apiService = new ApiService();

// Export individual methods for convenience
export const { get, post, put, delete: del, patch } = apiService;

