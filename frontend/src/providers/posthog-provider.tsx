'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
        const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

        if (key && key !== 'phc_placeholder_key') {
            posthog.init(key, {
                api_host: host,
                person_profiles: 'identified_only',
                capture_pageview: false,
                capture_pageleave: false,
                capture_exceptions: false,
                opt_out_capturing_by_default: true,
                session_recording: {
                    maskAllInputs: true,
                    maskTextSelector: ".sensitive-data",
                },
                autocapture: false,
            } as any)
        }
    }, [])

    return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
