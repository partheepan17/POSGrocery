/**
 * React Hook for Timezone Handling
 * Provides timezone utilities and state management
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getBrowserTimezone, 
  formatLocalTime, 
  formatLocalDate, 
  formatLocalDateTime,
  formatRelativeTime,
  localToUTC,
  utcToLocal,
  TimezoneInfo 
} from '@/utils/dateUtils';

export interface UseTimezoneReturn {
  timezone: TimezoneInfo;
  formatTime: (utcTimestamp: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatDate: (utcTimestamp: string | Date) => string;
  formatDateTime: (utcTimestamp: string | Date) => string;
  formatRelative: (utcTimestamp: string | Date) => string;
  toUTC: (localTimestamp: string | Date) => string;
  toLocal: (utcTimestamp: string | Date) => Date;
  isToday: (utcTimestamp: string | Date) => boolean;
  isYesterday: (utcTimestamp: string | Date) => boolean;
}

export function useTimezone(): UseTimezoneReturn {
  const [timezone, setTimezone] = useState<TimezoneInfo>(() => getBrowserTimezone());

  // Update timezone info periodically (in case of DST changes)
  useEffect(() => {
    const updateTimezone = () => {
      setTimezone(getBrowserTimezone());
    };

    // Update every hour to handle DST changes
    const interval = setInterval(updateTimezone, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = useCallback((utcTimestamp: string | Date, options?: Intl.DateTimeFormatOptions) => {
    return formatLocalTime(utcTimestamp, options);
  }, []);

  const formatDate = useCallback((utcTimestamp: string | Date) => {
    return formatLocalDate(utcTimestamp);
  }, []);

  const formatDateTime = useCallback((utcTimestamp: string | Date) => {
    return formatLocalDateTime(utcTimestamp);
  }, []);

  const formatRelative = useCallback((utcTimestamp: string | Date) => {
    return formatRelativeTime(utcTimestamp);
  }, []);

  const toUTC = useCallback((localTimestamp: string | Date) => {
    return localToUTC(localTimestamp);
  }, []);

  const toLocal = useCallback((utcTimestamp: string | Date) => {
    return utcToLocal(utcTimestamp);
  }, []);

  const isToday = useCallback((utcTimestamp: string | Date) => {
    try {
      const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
      const today = new Date();
      
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    } catch (error) {
      console.warn('Error checking if date is today:', error);
      return false;
    }
  }, []);

  const isYesterday = useCallback((utcTimestamp: string | Date) => {
    try {
      const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      return date.getDate() === yesterday.getDate() &&
             date.getMonth() === yesterday.getMonth() &&
             date.getFullYear() === yesterday.getFullYear();
    } catch (error) {
      console.warn('Error checking if date is yesterday:', error);
      return false;
    }
  }, []);

  return {
    timezone,
    formatTime,
    formatDate,
    formatDateTime,
    formatRelative,
    toUTC,
    toLocal,
    isToday,
    isYesterday
  };
}

/**
 * Hook for API calls with timezone headers
 */
export function useTimezoneHeaders() {
  const { timezone } = useTimezone();

  const getHeaders = useCallback(() => {
    return {
      'X-Timezone': timezone.timezone,
      'X-Timezone-Offset': timezone.offsetString
    };
  }, [timezone]);

  return { getHeaders, timezone };
}










