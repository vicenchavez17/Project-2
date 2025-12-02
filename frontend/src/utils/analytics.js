/**
 * Analytics Integration
 * Tracks user behavior and custom events via backend API
 * Events are logged to Cloud Logging and can be exported to BigQuery
 */

// Initialize analytics (no-op for backend-based tracking)
export const initGA = () => {
  console.log('Analytics initialized - using Cloud Logging backend');
};

// Helper function to send analytics events to backend
const sendAnalyticsEvent = async (eventName, eventData) => {
  try {
    await fetch('/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName,
        timestamp: new Date().toISOString(),
        ...eventData,
      }),
    });
  } catch (error) {
    console.error('Analytics event failed:', error);
  }
};

// Track page views
export const trackPageView = (path, title) => {
  sendAnalyticsEvent('page_view', {
    page_path: path,
    page_title: title,
  });
};

// Track when user starts image generation
export const trackGenerationStart = (userId, imageSource) => {
  sendAnalyticsEvent('generation_start', {
    category: 'engagement',
    imageSource,
    userId,
  });
};

// Track when image generation completes
export const trackGenerationComplete = (userId, duration, success = true) => {
  sendAnalyticsEvent('generation_complete', {
    category: 'engagement',
    status: success ? 'success' : 'failure',
    duration,
    userId,
  });
};

// Track user authentication
export const trackUserLogin = (userId, method) => {
  sendAnalyticsEvent('login', {
    method,
    userId,
  });
};

// Track user registration
export const trackUserSignup = (userId, method) => {
  sendAnalyticsEvent('sign_up', {
    method,
    userId,
  });
};

// Track when user views shopping links
export const trackShoppingLinkView = (userId, linkCount) => {
  sendAnalyticsEvent('view_shopping_links', {
    category: 'engagement',
    linkCount,
    userId,
  });
};

// Track when user clicks a shopping link
export const trackShoppingLinkClick = (userId, link, position) => {
  sendAnalyticsEvent('click_shopping_link', {
    category: 'conversion',
    link,
    position,
    userId,
  });
};

// Track Twitter integration usage
export const trackTwitterConnect = (userId) => {
  sendAnalyticsEvent('twitter_connect', {
    category: 'engagement',
    userId,
  });
};

// Track when user adds item to closet
export const trackAddToCloset = (userId) => {
  sendAnalyticsEvent('add_to_closet', {
    category: 'engagement',
    userId,
  });
};

// Track errors
export const trackError = (errorType, errorMessage, userId) => {
  sendAnalyticsEvent('exception', {
    errorType,
    errorMessage,
    userId,
  });
};

// Set user properties for segmentation
export const setUserProperties = (userId, properties) => {
  sendAnalyticsEvent('user_properties', {
    userId,
    properties,
  });
};
