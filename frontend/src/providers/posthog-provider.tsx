'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

if (typeof window !== 'undefined') {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

    if (key && key !== 'phc_placeholder_key') {
        posthog.init(key, {
            api_host: host,
            person_profiles: 'identified_only',
            capture_pageview: true,
            capture_pageleave: true,
            capture_exceptions: true,
            opt_out_capturing_by_default: false,
            session_recording: {
                maskAllInputs: true,
                maskTextSelector: ".sensitive-data",
            },
            autocapture: true,
        })
    }
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
    return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
