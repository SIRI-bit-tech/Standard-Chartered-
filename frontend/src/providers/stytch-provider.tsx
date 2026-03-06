import React, { useMemo } from 'react'
import { StytchProvider } from '@stytch/nextjs'
import { createStytchClient } from '@/lib/stytch-client'

export function StytchClientProvider({ children }: { children: React.ReactNode }) {
    const client = useMemo(() => createStytchClient(), [])

    return (
        <StytchProvider stytch={client}>
            {children}
        </StytchProvider>
    )
}
