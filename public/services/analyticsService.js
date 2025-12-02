import logger from './logger.js';

/**
 * Analytics Service
 * Logs analytics events to Cloud Logging with structured metadata
 * Events can be queried in Cloud Logging and exported to BigQuery
 */

/**
 * Log an analytics event
 * @param {string} eventName - Name of the event
 * @param {Object} eventData - Event data and metadata
 */
export function logAnalyticsEvent(eventName, eventData) {
  const { userId, category, timestamp, ...metadata } = eventData;
  
  logger.info(`Analytics Event: ${eventName}`, {
    activityType: 'ANALYTICS_EVENT',
    eventName,
    userId: userId || 'anonymous',
    category: category || 'general',
    timestamp: timestamp || new Date().toISOString(),
    ...metadata,
  });
}

/**
 * Log page view event
 */
export function logPageView(userId, path, title) {
  logAnalyticsEvent('page_view', {
    userId,
    category: 'navigation',
    page_path: path,
    page_title: title,
  });
}

/**
 * Log generation events
 */
export function logGenerationStart(userId, imageSource) {
  logAnalyticsEvent('generation_start', {
    userId,
    category: 'engagement',
    imageSource,
  });
}

export function logGenerationComplete(userId, duration, success) {
  logAnalyticsEvent('generation_complete', {
    userId,
    category: 'engagement',
    status: success ? 'success' : 'failure',
    duration,
  });
}

/**
 * Log authentication events
 */
export function logUserLogin(userId, method) {
  logAnalyticsEvent('login', {
    userId,
    category: 'authentication',
    method,
  });
}

export function logUserSignup(userId, method) {
  logAnalyticsEvent('sign_up', {
    userId,
    category: 'authentication',
    method,
  });
}

/**
 * Log shopping link interactions
 */
export function logShoppingLinkView(userId, linkCount) {
  logAnalyticsEvent('view_shopping_links', {
    userId,
    category: 'engagement',
    linkCount,
  });
}

export function logShoppingLinkClick(userId, link, position) {
  logAnalyticsEvent('click_shopping_link', {
    userId,
    category: 'conversion',
    link,
    position,
  });
}

/**
 * Log feature usage
 */
export function logTwitterConnect(userId) {
  logAnalyticsEvent('twitter_connect', {
    userId,
    category: 'engagement',
  });
}

export function logAddToCloset(userId) {
  logAnalyticsEvent('add_to_closet', {
    userId,
    category: 'engagement',
  });
}

/**
 * Log errors
 */
export function logAnalyticsError(userId, errorType, errorMessage) {
  logAnalyticsEvent('exception', {
    userId,
    category: 'error',
    errorType,
    errorMessage,
  });
}
