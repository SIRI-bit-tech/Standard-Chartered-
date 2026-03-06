'use client'

import React, { useMemo } from 'react'
import { StytchProvider } from '@stytch/nextjs'
import { createStytchClient } from '@/lib/stytch-client'

export function StytchClientProvider({ children }: { children: React.ReactNode }) {
    const client = useMemo(() => createStytchClient(), [])

    if (!client) {
        return <>{children}</>
    }

    return (
        <StytchProvider stytch={client as any}>
            {children}
        </StytchProvider>
    )
}
