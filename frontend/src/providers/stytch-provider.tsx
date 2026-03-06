'use client'

import React from 'react'
import { StytchProvider } from '@stytch/nextjs'
import { createStytchUIClient } from '@stytch/nextjs'

if (!process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN) {
    throw new Error('Missing NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN')
}

// Initialize Stytch only on the client
const stytchClient = typeof window !== 'undefined'
    ? createStytchUIClient(process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN)
    : null

export function StytchClientProvider({ children }: { children: React.ReactNode }) {
    // If we are on the server, we still render the provider but with a null client
    // StytchProvider handles null internally or we just pass it
    return (
        <StytchProvider stytch={stytchClient as any}>
            {children}
        </StytchProvider>
    )
}
