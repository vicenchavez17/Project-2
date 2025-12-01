import { logHttpRequest, logError } from '../services/logger.js';

/**
 * Middleware to log all HTTP requests and responses
 * Captures method, path, status code, duration, and user info
 */
export function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // Capture original end function
  const originalEnd = res.end;
  
  // Override res.end to capture response details
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    // Extract user info from JWT token if available
    const userId = req.user?.email || 'anonymous';
    
    // Log the request
    logHttpRequest(req.method, req.path, res.statusCode, {
      userId,
      duration,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
    });
    
    // Call original end function
    originalEnd.apply(res, args);
  };
  
  next();
}

/**
 * Error handling middleware
 * Logs all errors and sends appropriate response
 */
export function errorLogger(err, req, res, next) {
  const userId = req.user?.email || 'anonymous';
  
  logError(err, {
    userId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    body: req.body,
  });
  
  // Send error response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
