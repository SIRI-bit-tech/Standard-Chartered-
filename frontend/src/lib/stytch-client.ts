import { createStytchUIClient } from "@stytch/nextjs";

const publicToken = process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN || "";

/**
 * Initializer for the Stytch UI client.
 * Calls createStytchUIClient directly.
 */
export const createStytchClient = () => createStytchUIClient(publicToken);

/**
 * Singleton instance for browser-side usage.
 * Null on server to avoid SSR initialization issues.
 */
export const stytchClient = typeof window !== 'undefined' && publicToken
    ? createStytchClient()
    : null;