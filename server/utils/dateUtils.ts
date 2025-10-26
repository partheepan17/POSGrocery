/**
 * Date Utilities for UTC Handling
 * Ensures all timestamps are stored and handled as UTC
 */

export interface TimezoneInfo {
  timezone: string;
  offset: number; // in minutes
  offsetString: string; // e.g., "+05:30", "-08:00"
}

/**
 * Get timezone information from request headers
 */
export function getTimezoneFromRequest(req: any): TimezoneInfo {
  const timezoneHeader = req.headers['x-timezone'] || req.headers['x-timezone-offset'];
  const userAgent = req.headers['user-agent'] || '';
  
  // Default to UTC if no timezone specified
  const defaultTimezone = 'UTC';
  
  if (timezoneHeader) {
    try {
      // Parse timezone header (e.g., "Asia/Colombo", "+05:30", "-08:00")
      if (timezoneHeader.startsWith('+') || timezoneHeader.startsWith('-')) {
        // Offset format: +05:30, -08:00
        const offsetMatch = timezoneHeader.match(/^([+-])(\d{2}):(\d{2})$/);
        if (offsetMatch) {
          const sign = offsetMatch[1] === '+' ? 1 : -1;
          const hours = parseInt(offsetMatch[2]);
          const minutes = parseInt(offsetMatch[3]);
          const offsetMinutes = sign * (hours * 60 + minutes);
          
          return {
            timezone: `UTC${timezoneHeader}`,
            offset: offsetMinutes,
            offsetString: timezoneHeader
          };
        }
      } else {
        // Timezone name format: Asia/Colombo, America/New_York
        const offset = getTimezoneOffset(timezoneHeader);
        return {
          timezone: timezoneHeader,
          offset,
          offsetString: formatOffset(offset)
        };
      }
    } catch (error) {
      console.warn('Invalid timezone header:', timezoneHeader, error);
    }
  }
  
  // Fallback to browser timezone detection or UTC
  return {
    timezone: defaultTimezone,
    offset: 0,
    offsetString: '+00:00'
  };
}

/**
 * Get timezone offset in minutes for a given timezone
 */
function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
    return (targetTime.getTime() - utc.getTime()) / (1000 * 60);
  } catch (error) {
    console.warn('Error getting timezone offset for:', timezone, error);
    return 0;
  }
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
 * Convert UTC timestamp to local timezone
 */
export function toLocalTime(utcTimestamp: string | Date, timezone: string): Date {
  try {
    const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
    
    if (timezone === 'UTC') {
      return date;
    }
    
    // Convert to local time using the specified timezone
    const localTime = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return localTime;
  } catch (error) {
    console.warn('Error converting to local time:', error);
    return typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
  }
}

/**
 * Convert local timestamp to UTC
 */
export function toUTC(localTimestamp: string | Date, timezone: string): Date {
  try {
    const date = typeof localTimestamp === 'string' ? new Date(localTimestamp) : localTimestamp;
    
    if (timezone === 'UTC') {
      return date;
    }
    
    // Get the timezone offset and adjust
    const offset = getTimezoneOffset(timezone);
    const utcTime = new Date(date.getTime() - (offset * 60000));
    return utcTime;
  } catch (error) {
    console.warn('Error converting to UTC:', error);
    return typeof localTimestamp === 'string' ? new Date(localTimestamp) : localTimestamp;
  }
}

/**
 * Format UTC timestamp for display in local timezone
 */
export function formatLocalTime(
  utcTimestamp: string | Date, 
  timezone: string, 
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
      timeZone: timezone,
      ...options
    };
    
    return date.toLocaleString('en-US', defaultOptions);
  } catch (error) {
    console.warn('Error formatting local time:', error);
    return typeof utcTimestamp === 'string' ? utcTimestamp : utcTimestamp.toISOString();
  }
}

/**
 * Get current UTC timestamp as ISO string
 */
export function getCurrentUTC(): string {
  return new Date().toISOString();
}

/**
 * Parse date string and ensure it's in UTC
 */
export function parseToUTC(dateString: string): Date {
  try {
    const date = new Date(dateString);
    
    // If the date string doesn't include timezone info, assume it's local time
    if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
      // This is a local time, convert to UTC
      return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    }
    
    return date;
  } catch (error) {
    console.warn('Error parsing date to UTC:', error);
    return new Date();
  }
}

/**
 * Format date range for database queries
 */
export function formatDateRange(startDate: string, endDate: string, timezone: string): {
  startUTC: string;
  endUTC: string;
} {
  try {
    // Parse dates and convert to UTC
    const start = toUTC(startDate, timezone);
    const end = toUTC(endDate, timezone);
    
    // Ensure end date is end of day
    end.setHours(23, 59, 59, 999);
    
    return {
      startUTC: start.toISOString(),
      endUTC: end.toISOString()
    };
  } catch (error) {
    console.warn('Error formatting date range:', error);
    return {
      startUTC: startDate,
      endUTC: endDate
    };
  }
}

/**
 * Add timezone info to API response
 */
export function addTimezoneInfo(data: any, timezone: TimezoneInfo): any {
  if (Array.isArray(data)) {
    return data.map(item => addTimezoneInfo(item, timezone));
  }
  
  if (data && typeof data === 'object') {
    const result = { ...data };
    
    // Add timezone info to response
    result._timezone = {
      timezone: timezone.timezone,
      offset: timezone.offset,
      offsetString: timezone.offsetString
    };
    
    // Convert timestamp fields to local time
    const timestampFields = ['created_at', 'updated_at', 'sale_date', 'createdAt', 'updatedAt'];
    timestampFields.forEach(field => {
      if (result[field]) {
        result[`${field}_local`] = formatLocalTime(result[field], timezone.timezone);
      }
    });
    
    return result;
  }
  
  return data;
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get list of common timezones
 */
export function getCommonTimezones(): Array<{ value: string; label: string; offset: string }> {
  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Asia/Colombo',
    'Australia/Sydney',
    'Pacific/Auckland'
  ];
  
  return timezones.map(tz => {
    const offset = getTimezoneOffset(tz);
    return {
      value: tz,
      label: `${tz} (${formatOffset(offset)})`,
      offset: formatOffset(offset)
    };
  });
}










