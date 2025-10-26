import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isYesterdaySession } from '../isYesterdaySession';

describe('isYesterdaySession', () => {
  let mockDate: Date;

  beforeEach(() => {
    // Mock the current date to 2024-01-15 12:00:00
    mockDate = new Date('2024-01-15T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return false for null input', () => {
    expect(isYesterdaySession(null)).toBe(false);
  });

  it('should return false for undefined input', () => {
    expect(isYesterdaySession(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isYesterdaySession('')).toBe(false);
  });

  it('should return false for today\'s date', () => {
    const today = '2024-01-15T10:30:00.000Z';
    expect(isYesterdaySession(today)).toBe(false);
  });

  it('should return true for yesterday\'s date', () => {
    const yesterday = '2024-01-14T10:30:00.000Z';
    expect(isYesterdaySession(yesterday)).toBe(true);
  });

  it('should return true for any previous day', () => {
    const lastWeek = '2024-01-08T10:30:00.000Z';
    expect(isYesterdaySession(lastWeek)).toBe(true);
  });

  it('should return true for future date (different day)', () => {
    const tomorrow = '2024-01-16T10:30:00.000Z';
    expect(isYesterdaySession(tomorrow)).toBe(true);
  });

  it('should handle different time formats', () => {
    // ISO string
    expect(isYesterdaySession('2024-01-14T10:30:00.000Z')).toBe(true);
    
    // Date string
    expect(isYesterdaySession('2024-01-14')).toBe(true);
    
    // Different timezone - use local time to avoid timezone issues
    expect(isYesterdaySession('2024-01-14T23:59:59.999')).toBe(true);
  });

  it('should return false for invalid date format', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(isYesterdaySession('invalid-date')).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Invalid date format for openedAt:',
      'invalid-date'
    );
    
    consoleSpy.mockRestore();
  });

  it('should handle edge case at midnight', () => {
    // Set time to just after midnight
    vi.setSystemTime(new Date('2024-01-15T00:01:00.000Z'));
    
    // Session from yesterday at 23:59
    const yesterdayLate = '2024-01-14T23:59:59.999';
    expect(isYesterdaySession(yesterdayLate)).toBe(true);
    
    // Session from today at 00:00
    const todayEarly = '2024-01-15T00:00:00.000';
    expect(isYesterdaySession(todayEarly)).toBe(false);
  });

  it('should handle different timezones correctly', () => {
    // Session from yesterday in different timezone
    const yesterdayUTC = '2024-01-14T18:00:00.000Z'; // 6 PM UTC on Jan 14
    expect(isYesterdaySession(yesterdayUTC)).toBe(true);
    
    // Session from today in different timezone
    const todayUTC = '2024-01-15T06:00:00.000Z'; // 6 AM UTC on Jan 15
    expect(isYesterdaySession(todayUTC)).toBe(false);
  });
});
