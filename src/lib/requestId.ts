// Request ID management for tracking requests across the application
import React from 'react';

class RequestIdManager {
  private currentRequestId: string | null = null;
  private requestCounter = 0;

  generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const counter = (++this.requestCounter).toString(36);
    
    return `${timestamp}-${random}-${counter}`;
  }

  setRequestId(id: string) {
    this.currentRequestId = id;
  }

  getRequestId(): string | null {
    return this.currentRequestId;
  }

  clearRequestId() {
    this.currentRequestId = null;
  }

  // Generate a new request ID and set it as current
  startNewRequest(): string {
    const newId = this.generateRequestId();
    this.setRequestId(newId);
    return newId;
  }
}

// Global request ID manager
export const requestIdManager = new RequestIdManager();

// Hook for React components
export function useRequestId() {
  const [requestId, setRequestId] = React.useState<string | null>(null);

  const startNewRequest = React.useCallback(() => {
    const newId = requestIdManager.startNewRequest();
    setRequestId(newId);
    return newId;
  }, []);

  const setCurrentRequestId = React.useCallback((id: string) => {
    requestIdManager.setRequestId(id);
    setRequestId(id);
  }, []);

  const clearRequestId = React.useCallback(() => {
    requestIdManager.clearRequestId();
    setRequestId(null);
  }, []);

  React.useEffect(() => {
    setRequestId(requestIdManager.getRequestId());
  }, []);

  return {
    requestId,
    startNewRequest,
    setCurrentRequestId,
    clearRequestId,
  };
}

// Fetch wrapper that automatically includes request ID
export async function fetchWithRequestId(
  url: string,
  options: RequestInit = {},
  requestId?: string
): Promise<Response> {
  const currentRequestId = requestId || requestIdManager.getRequestId();
  
  const headers = new Headers(options.headers);
  if (currentRequestId) {
    headers.set('X-Request-ID', currentRequestId);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Extract request ID from response headers if present
  const responseRequestId = response.headers.get('X-Request-ID');
  if (responseRequestId && !currentRequestId) {
    requestIdManager.setRequestId(responseRequestId);
  }

  return response;
}

// Error class that includes request ID
export class RequestError extends Error {
  public readonly requestId: string | null;
  public readonly status?: number;
  public readonly code?: string;

  constructor(
    message: string,
    requestId?: string | null,
    status?: number,
    code?: string
  ) {
    super(message);
    this.name = 'RequestError';
    this.requestId = requestId || requestIdManager.getRequestId();
    this.status = status;
    this.code = code;
  }
}

// Utility to extract request ID from error
export function getRequestIdFromError(error: any): string | null {
  if (error instanceof RequestError) {
    return error.requestId;
  }
  
  if (error?.requestId) {
    return error.requestId;
  }
  
  return requestIdManager.getRequestId();
}

// Utility to create error with request ID
export function createErrorWithRequestId(
  message: string,
  originalError?: any,
  requestId?: string
): Error {
  const error = new Error(message);
  (error as any).requestId = requestId || requestIdManager.getRequestId();
  (error as any).originalError = originalError;
  return error;
}

