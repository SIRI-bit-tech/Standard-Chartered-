import { createStytchUIClient } from "@stytch/nextjs";

const publicToken = process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN || "";

/**
 * Initializer for the Stytch UI client.
 * Calls createStytchUIClient directly.
 */
export const createStytchClient = () => {
    if (!publicToken) return null;
    return createStytchUIClient(publicToken);
};


/**
 * Singleton instance.
 * @stytch/nextjs handles SSR stubbing internally.
 */
export const stytchClient = createStytchClient() as any;