// Analytics implementation for live website

let currentUserId: string | null = null;

/**
 * SHA-256 hashes a string (like an email) for safe analytics tracking.
 */
export async function hashString(str: string): Promise<string> {
  const normalized = str.toLowerCase().trim();
  const msgBuffer = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Identifies a user for analytics tracking
 */
export function identifyUser(userId: string, traits?: Record<string, any>) {
  currentUserId = userId;

  // Store user data for analytics (can be extended with actual analytics service)
  if (typeof window !== 'undefined') {
    // Store in localStorage for persistence
    localStorage.setItem('analytics_user_id', userId);
    if (traits) {
      localStorage.setItem('analytics_user_traits', JSON.stringify(traits));
    }
  }
}

/**
 * Resets analytics session (used for logout)
 */
export function resetAnalytics() {
  currentUserId = null;

  // Clear stored analytics data
  if (typeof window !== 'undefined') {
    localStorage.removeItem('analytics_user_id');
    localStorage.removeItem('analytics_user_traits');
  }
}

/**
 * Tracks an event for analytics
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    // Store events in localStorage (can be sent to analytics service later)
    const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    events.push({
      event: eventName,
      properties: properties || {},
      userId: currentUserId,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 events to avoid storage bloat
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }

    localStorage.setItem('analytics_events', JSON.stringify(events));
  }
}

/**
 * Gets current analytics data
 */
export function getAnalyticsData() {
  if (typeof window !== 'undefined') {
    return {
      userId: currentUserId,
      traits: JSON.parse(localStorage.getItem('analytics_user_traits') || '{}'),
      events: JSON.parse(localStorage.getItem('analytics_events') || '[]')
    };
  }
  return { userId: null, traits: {}, events: [] };
}
