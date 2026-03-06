import { createStytchUIClient } from "@stytch/nextjs";

const publicToken = process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN || "";

/**
 * Initializer for the Stytch UI client.
 * Calls createStytchUIClient directly.
 */
export const createStytchClient = () => {
    if (typeof window === 'undefined' || !publicToken) return null;
    return createStytchUIClient(publicToken);
};


/**
 * Singleton instance for browser-side usage.
 * Null on server to avoid SSR initialization issues.
 */
export const stytchClient = (typeof window !== 'undefined' ? createStytchClient() : null) as any;