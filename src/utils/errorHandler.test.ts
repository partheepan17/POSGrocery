import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandler, AppError, ErrorCodes, createError } from './errorHandler';

// Mock fetch
(globalThis as any).fetch = vi.fn();

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    errorHandler.clearErrorLog();
    vi.clearAllMocks();
  });

  describe('handleError', () => {
    it('handles regular errors', () => {
      const error = new Error('Test error');
      const errorInfo = errorHandler.handleError(error, {
        component: 'TestComponent',
        action: 'testAction',
        userId: 'user123'
      });

      expect(errorInfo.code).toBe('UNKNOWN_ERROR');
      expect(errorInfo.message).toBe('Test error');
      expect(errorInfo.component).toBe('TestComponent');
      expect(errorInfo.action).toBe('testAction');
      expect(errorInfo.userId).toBe('user123');
    });

    it('handles AppError instances', () => {
      const appError = new AppError('Custom error', 'CUSTOM_ERROR', { details: 'test' });
      const errorInfo = errorHandler.handleError(appError);

      expect(errorInfo.code).toBe('CUSTOM_ERROR');
      expect(errorInfo.message).toBe('Custom error');
      expect(errorInfo.details).toEqual({ details: 'test' });
    });

    it('maintains error log with max size', () => {
      // Add more errors than maxLogSize
      for (let i = 0; i < 150; i++) {
        errorHandler.handleError(new Error(`Error ${i}`));
      }

      const log = errorHandler.getErrorLog();
      expect(log.length).toBeLessThanOrEqual(100);
      expect(log[0].message).toBe('Error 149'); // Most recent error first
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('returns user-friendly message for known error codes', () => {
      const networkError = new AppError('Network failed', ErrorCodes.NETWORK_ERROR);
      const message = errorHandler.getUserFriendlyMessage(networkError);
      
      expect(message).toBe('Unable to connect to the server. Please check your internet connection.');
    });

    it('returns generic message for unknown errors', () => {
      const unknownError = new Error('Unknown error');
      const message = errorHandler.getUserFriendlyMessage(unknownError);
      
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });

    it('returns custom message for user-friendly AppError', () => {
      const userError = new AppError('Custom user message', 'CUSTOM', undefined, true);
      const message = errorHandler.getUserFriendlyMessage(userError);
      
      expect(message).toBe('Custom user message');
    });
  });

  describe('AppError', () => {
    it('creates error with all properties', () => {
      const error = new AppError(
        'Test message',
        'TEST_ERROR',
        { test: 'data' },
        true,
        true
      );

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ test: 'data' });
      expect(error.isUserFriendly).toBe(true);
      expect(error.shouldRetry).toBe(true);
    });
  });

  describe('createError helpers', () => {
    it('creates network error', () => {
      const error = createError.network('Connection failed');
      
      expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(error.isUserFriendly).toBe(true);
      expect(error.shouldRetry).toBe(true);
    });

    it('creates auth error', () => {
      const error = createError.auth('Invalid credentials');
      
      expect(error.code).toBe(ErrorCodes.AUTHENTICATION_ERROR);
      expect(error.isUserFriendly).toBe(true);
      expect(error.shouldRetry).toBe(false);
    });

    it('creates validation error', () => {
      const error = createError.validation('Required field missing');
      
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.isUserFriendly).toBe(true);
      expect(error.shouldRetry).toBe(false);
    });

    it('creates business error', () => {
      const error = createError.business('Insufficient stock', ErrorCodes.INSUFFICIENT_STOCK);
      
      expect(error.code).toBe(ErrorCodes.INSUFFICIENT_STOCK);
      expect(error.isUserFriendly).toBe(true);
      expect(error.shouldRetry).toBe(false);
    });

    it('creates system error', () => {
      const error = createError.system('Database connection failed');
      
      expect(error.code).toBe(ErrorCodes.SERVER_ERROR);
      expect(error.isUserFriendly).toBe(false);
      expect(error.shouldRetry).toBe(true);
    });
  });

  describe('Error logging service', () => {
    it('sends error to logging service in production', async () => {
      // Mock production environment
      const originalEnv = import.meta.env.PROD;
      import.meta.env.PROD = true;

      const error = new Error('Test error');
      errorHandler.handleError(error);

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(fetch).toHaveBeenCalledWith('/api/logs/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"code":"UNKNOWN_ERROR"')
      });

      // Restore original environment
      import.meta.env.PROD = originalEnv;
    });
  });
});










