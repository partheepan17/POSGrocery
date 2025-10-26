/**
 * Timezone Middleware
 * Handles timezone headers and adds timezone info to requests
 */

import { Request, Response, NextFunction } from 'express';
import { getTimezoneFromRequest, TimezoneInfo } from '../utils/dateUtils';

// Extend Express Request interface to include timezone
declare global {
  namespace Express {
    interface Request {
      timezone?: TimezoneInfo;
    }
  }
}

/**
 * Middleware to parse timezone from headers
 */
export function timezoneMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get timezone info from request headers
    req.timezone = getTimezoneFromRequest(req);
    
    // Add timezone info to response headers
    res.set('X-Timezone', req.timezone.timezone);
    res.set('X-Timezone-Offset', req.timezone.offsetString);
    
    next();
  } catch (error) {
    console.warn('Error in timezone middleware:', error);
    // Continue without timezone info
    req.timezone = {
      timezone: 'UTC',
      offset: 0,
      offsetString: '+00:00'
    };
    next();
  }
}

/**
 * Middleware to add timezone info to API responses
 */
export function addTimezoneToResponse(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    if (req.timezone && data && typeof data === 'object') {
      // Add timezone info to successful responses
      if (data.success !== false) {
        data._timezone = {
          timezone: req.timezone.timezone,
          offset: req.timezone.offset,
          offsetString: req.timezone.offsetString
        };
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}










