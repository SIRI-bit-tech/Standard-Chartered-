'use client'

import React from 'react'
import { StytchProvider } from '@stytch/nextjs'
import { stytchClient } from '@/lib/stytch-client'

export function StytchClientProvider({ children }: { children: React.ReactNode }) {
    if (!stytchClient) {
        return <>{children}</>
    }

    return (
        <StytchProvider stytch={stytchClient}>
            {children}
        </StytchProvider>
    )
}
