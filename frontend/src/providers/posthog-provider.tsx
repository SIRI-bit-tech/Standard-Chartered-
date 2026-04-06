'use client'

import { useEffect, useState } from 'react'

// Dynamically import PostHog only on non-iOS devices
let posthog: any = null
let PostHogProvider: any = null

if (typeof window !== 'undefined') {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    
    // Only import PostHog on non-iOS devices
    if (!isIOS) {
        import('posthog-js').then((module) => {
            posthog = module.default
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
        })
        
        import('posthog-js/react').then((module) => {
            PostHogProvider = module.PostHogProvider
        })
    }
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
    const [isIOS, setIsIOS] = useState(false)
    const [isReady, setIsReady] = useState(false)
    
    useEffect(() => {
        const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
        setIsIOS(iOS)
        
        // Wait for PostHog to load on non-iOS devices
        if (!iOS && PostHogProvider) {
            setIsReady(true)
        } else if (iOS) {
            setIsReady(true)
        }
    }, [])
    
    // Don't render PostHog provider on iOS - just return children
    if (isIOS || !PostHogProvider || !posthog) {
        return <>{children}</>
    }
    
    if (!isReady) {
        return <>{children}</>
    }
    
    return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
