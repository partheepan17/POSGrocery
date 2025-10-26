/**
 * Frontend Date Utilities for Timezone Handling
 * Converts UTC timestamps from API to local browser timezone
 */

export interface TimezoneInfo {
  timezone: string;
  offset: number;
  offsetString: string;
}

/**
 * Get browser timezone information
 */
export function getBrowserTimezone(): TimezoneInfo {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  const offset = -now.getTimezoneOffset(); // Note: getTimezoneOffset() returns negative offset
  
  return {
    timezone,
    offset,
    offsetString: formatOffset(offset)
  };
}

/**
 * Format offset in minutes to string format
 */
function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Convert UTC timestamp to local browser time
 */
export function utcToLocal(utcTimestamp: string | Date): Date {
  try {
    const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
    
    // If the timestamp is already in local time, return as is
    if (typeof utcTimestamp === 'string' && !utcTimestamp.includes('Z') && !utcTimestamp.includes('+') && !utcTimestamp.includes('-', 10)) {
      return date;
    }
    
    // Convert UTC to local time
    return new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
  } catch (error) {
    console.warn('Error converting UTC to local time:', error);
    return typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
  }
}

/**
 * Convert local timestamp to UTC for API calls
 */
export function localToUTC(localTimestamp: string | Date): string {
  try {
    const date = typeof localTimestamp === 'string' ? new Date(localTimestamp) : localTimestamp;
    
    // Convert local time to UTC
    const utcTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return utcTime.toISOString();
  } catch (error) {
    console.warn('Error converting local time to UTC:', error);
    return typeof localTimestamp === 'string' ? localTimestamp : localTimestamp.toISOString();
  }
}

/**
 * Format UTC timestamp for display in local timezone
 */
export function formatLocalTime(
  utcTimestamp: string | Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      ...options
    };
    
    return date.toLocaleString(undefined, defaultOptions);
  } catch (error) {
    console.warn('Error formatting local time:', error);
    return typeof utcTimestamp === 'string' ? utcTimestamp : utcTimestamp.toISOString();
  }
}

/**
 * Format date for display (date only)
 */
export function formatLocalDate(utcTimestamp: string | Date): string {
  return formatLocalTime(utcTimestamp, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Format time for display (time only)
 */
export function formatLocalTimeOnly(utcTimestamp: string | Date): string {
  return formatLocalTime(utcTimestamp, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Format date and time for display
 */
export function formatLocalDateTime(utcTimestamp: string | Date): string {
  return formatLocalTime(utcTimestamp, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(utcTimestamp: string | Date): string {
  try {
    const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return formatLocalDate(utcTimestamp);
    }
  } catch (error) {
    console.warn('Error formatting relative time:', error);
    return formatLocalDate(utcTimestamp);
  }
}

/**
 * Parse date range for API calls
 */
export function parseDateRange(startDate: string, endDate: string): {
  startUTC: string;
  endUTC: string;
} {
  try {
    // Parse dates and convert to UTC
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Ensure end date is end of day
    end.setHours(23, 59, 59, 999);
    
    return {
      startUTC: localToUTC(start),
      endUTC: localToUTC(end)
    };
  } catch (error) {
    console.warn('Error parsing date range:', error);
    return {
      startUTC: startDate,
      endUTC: endDate
    };
  }
}

/**
 * Get current UTC timestamp
 */
export function getCurrentUTC(): string {
  return new Date().toISOString();
}

/**
 * Get current local timestamp
 */
export function getCurrentLocal(): string {
  return new Date().toLocaleString();
}

/**
 * Check if timestamp is today
 */
export function isToday(utcTimestamp: string | Date): boolean {
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
}

/**
 * Check if timestamp is yesterday
 */
export function isYesterday(utcTimestamp: string | Date): boolean {
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
}

/**
 * Get date range for common periods
 */
export function getDateRange(period: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear'): {
  start: string;
  end: string;
} {
  const now = new Date();
  
  switch (period) {
    case 'today': {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);
      return {
        start: localToUTC(todayStart),
        end: localToUTC(todayEnd)
      };
    }
      
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = new Date(yesterday);
      yesterdayStart.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);
      return {
        start: localToUTC(yesterdayStart),
        end: localToUTC(yesterdayEnd)
      };
    }
      
    case 'thisWeek': {
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - now.getDay());
      thisWeekStart.setHours(0, 0, 0, 0);
      const thisWeekEnd = new Date(now);
      thisWeekEnd.setHours(23, 59, 59, 999);
      return {
        start: localToUTC(thisWeekStart),
        end: localToUTC(thisWeekEnd)
      };
    }
      
    case 'lastWeek': {
      const lastWeekStart = new Date(now);
      lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
      lastWeekStart.setHours(0, 0, 0, 0);
      const lastWeekEnd = new Date(now);
      lastWeekEnd.setDate(now.getDate() - now.getDay() - 1);
      lastWeekEnd.setHours(23, 59, 59, 999);
      return {
        start: localToUTC(lastWeekStart),
        end: localToUTC(lastWeekEnd)
      };
    }
      
    case 'thisMonth': {
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      thisMonthStart.setHours(0, 0, 0, 0);
      const thisMonthEnd = new Date(now);
      thisMonthEnd.setHours(23, 59, 59, 999);
      return {
        start: localToUTC(thisMonthStart),
        end: localToUTC(thisMonthEnd)
      };
    }
      
    case 'lastMonth': {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      lastMonthStart.setHours(0, 0, 0, 0);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      lastMonthEnd.setHours(23, 59, 59, 999);
      return {
        start: localToUTC(lastMonthStart),
        end: localToUTC(lastMonthEnd)
      };
    }
      
    case 'thisYear': {
      const thisYearStart = new Date(now.getFullYear(), 0, 1);
      thisYearStart.setHours(0, 0, 0, 0);
      const thisYearEnd = new Date(now);
      thisYearEnd.setHours(23, 59, 59, 999);
      return {
        start: localToUTC(thisYearStart),
        end: localToUTC(thisYearEnd)
      };
    }
      
    case 'lastYear': {
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
      lastYearStart.setHours(0, 0, 0, 0);
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
      lastYearEnd.setHours(23, 59, 59, 999);
      return {
        start: localToUTC(lastYearStart),
        end: localToUTC(lastYearEnd)
      };
    }
      
    default:
      return {
        start: localToUTC(now),
        end: localToUTC(now)
      };
  }
}

/**
 * Format date for date input (YYYY-MM-DD)
 */
export function formatForDateInput(utcTimestamp: string | Date): string {
  try {
    const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn('Error formatting date for input:', error);
    return '';
  }
}

/**
 * Format time for time input (HH:MM)
 */
export function formatForTimeInput(utcTimestamp: string | Date): string {
  try {
    const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
    return date.toTimeString().split(' ')[0].substring(0, 5);
  } catch (error) {
    console.warn('Error formatting time for input:', error);
    return '';
  }
}



