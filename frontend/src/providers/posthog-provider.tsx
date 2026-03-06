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
                capture_pageview: true,
                capture_pageleave: true,
                capture_exceptions: true, // Enable automatic error/exception tracking
                session_recording: {
                    maskAllInputs: false, // Set to true if you want total privacy
                    maskTextSelector: ".sensitive-data", // Example of selective masking
                },
                autocapture: {
                    css_selector_allowlist: ['[id]', '[class]'], // Ensure we get meaningful data
                    dead_clicks: true, // Track clicks on non-interactive elements
                },
            } as any)
        }
    }, [])

    return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
