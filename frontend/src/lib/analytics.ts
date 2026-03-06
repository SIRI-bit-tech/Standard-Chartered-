import posthog from 'posthog-js';

/**
 * Analytics utility to centralize consent checks and PII masking.
 */

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
 * Safely identifies a user in PostHog if consent is given.
 * Automatically strips common PII fields.
 */
export function identifyUser(userId: string, properties: Record<string, any> = {}) {
    if (!posthog.has_opted_in_capturing()) return;

    // Ensure PII is not sent
    const { email, name, username, first_name, last_name, ...safeProperties } = properties;

    posthog.identify(userId, safeProperties);
}

/**
 * Tracks an event in PostHog if consent is given.
 */
export function trackEvent(event: string, properties: Record<string, any> = {}) {
    if (!posthog.has_opted_in_capturing()) return;

    posthog.capture(event, properties);
}

/**
 * Helper to check if analytics consent is granted.
 * Can be expanded to check local storage or custom context.
 */
export function hasConsent(): boolean {
    return posthog.has_opted_in_capturing();
}

/**
 * Resets PostHog identity (useful for logout).
 */
export function resetAnalytics() {
    posthog.reset();
}
