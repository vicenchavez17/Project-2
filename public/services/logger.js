import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';

/**
 * Centralized logging service using Winston + Google Cloud Logging
 * Logs are sent to both console (for development) and Cloud Logging (for production)
 */

// Create Cloud Logging transport
const loggingWinston = new LoggingWinston({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  // Log name that appears in Cloud Logging
  logName: 'apparel-app-logs',
});

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'apparel-recommendation-service' },
  transports: [
    // Console logging for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...metadata }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
          }
          return msg;
        })
      ),
    }),
    // Cloud Logging for production
    loggingWinston,
  ],
});

/**
 * Log authentication events (login, registration)
 */
export function logAuthEvent(eventType, userId, metadata = {}) {
  logger.info(`Auth Event: ${eventType}`, {
    activityType: eventType,
    userId,
    category: 'authentication',
    ...metadata,
  });
}

/**
 * Log image generation events
 */
export function logImageGeneration(userId, metadata = {}) {
  logger.info('Image Generation Request', {
    activityType: 'IMAGE_GENERATION',
    userId,
    category: 'image-processing',
    ...metadata,
  });
}

/**
 * Log API calls to external services (Vision API, AI Platform, Twitter, etc.)
 * @param {string} service - Name of the external service (e.g., 'Vision API', 'Twitter API')
 * @param {string} operation - Specific operation performed (e.g., 'labelDetection', 'getUserMedia')
 * @param {Object} metadata - Additional data including:
 *   - duration: Response time in milliseconds
 *   - success: Boolean indicating if call was successful
 *   - statusCode: HTTP status code if applicable
 *   - errorMessage: Error message if failed
 *   - Any other relevant context
 */
export function logExternalApiCall(service, operation, metadata = {}) {
  const logLevel = metadata.success === false ? 'error' : 'info';
  const message = metadata.success === false 
    ? `External API Call Failed: ${service} - ${operation}`
    : `External API Call: ${service} - ${operation}`;
  
  logger[logLevel](message, {
    activityType: 'EXTERNAL_API_CALL',
    service,
    operation,
    category: 'api',
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

/**
 * Log HTTP requests
 */
export function logHttpRequest(method, path, statusCode, metadata = {}) {
  logger.info(`HTTP ${method} ${path} - ${statusCode}`, {
    activityType: 'HTTP_REQUEST',
    method,
    path,
    statusCode,
    category: 'http',
    ...metadata,
  });
}

/**
 * Log errors with full context
 */
export function logError(error, context = {}) {
  logger.error('Application Error', {
    activityType: 'ERROR',
    category: 'error',
    errorMessage: error.message,
    errorStack: error.stack,
    ...context,
  });
}

/**
 * Log warnings
 */
export function logWarning(message, metadata = {}) {
  logger.warn(message, {
    activityType: 'WARNING',
    category: 'warning',
    ...metadata,
  });
}

export default logger;
