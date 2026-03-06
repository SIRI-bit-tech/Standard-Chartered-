import { createStytchUIClient } from "@stytch/nextjs";

if (!process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN) {
    throw new Error("Missing NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN");
}

export const stytchClient = (typeof window !== 'undefined'
    ? createStytchUIClient(process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN)
    : null) as any;