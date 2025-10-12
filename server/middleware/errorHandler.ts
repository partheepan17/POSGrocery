import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  
  // Handle standardized errors
  if (err.code && err.status) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      details: err.details || {},
      timestamp: err.timestamp || new Date().toISOString(),
      requestId: err.requestId
    });
  }
  
  // Handle legacy errors
  const status = err.status ?? 500;
  res.status(status).json({ 
    ok: false, 
    message: err.expose ? err.message : (err.message || 'Internal Server Error') 
  });
}
