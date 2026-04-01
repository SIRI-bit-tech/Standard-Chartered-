'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[]
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed'
        platform: string
    }>
    prompt(): Promise<void>
}

// Helper to handle the installation choice logic and reduce nesting
async function handleUserInstallChoice(e: BeforeInstallPromptEvent, now: number, ONE_DAY: number) {
    await e.prompt()
    const choiceResult = await e.userChoice
    if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt')
        // Don't show again for a month
        localStorage.setItem('pwa-prompt-last-shown', (now + ONE_DAY * 30).toString())
    }
}

export function PWAInstaller() {
    useEffect(() => {
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
        const isStandalone =
            globalThis.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

        const ONE_DAY = 24 * 60 * 60 * 1000

        // Completely disable PWA prompts on iOS
        if (isIOS) {
            return
        }

        const handler = (e: BeforeInstallPromptEvent) => {
            e.preventDefault()

            const lastShown = localStorage.getItem('pwa-prompt-last-shown')
            const now = Date.now()

            if (isStandalone || (lastShown && now - Number.parseInt(lastShown) < ONE_DAY)) {
                return
            }

            toast("Install SC Banking App", {
                description: "Install our app for a better banking experience offline.",
                action: {
                    label: "Install",
                    onClick: () => {
                        handleUserInstallChoice(e, now, ONE_DAY)
                    },
                },
                onAutoClose: () => localStorage.setItem('pwa-prompt-last-shown', now.toString()),
                onDismiss: () => localStorage.setItem('pwa-prompt-last-shown', now.toString()),
                duration: 10000,
            })
        }

        globalThis.addEventListener('beforeinstallprompt', handler as EventListener)

        const appInstalledHandler = () => {
            console.log('PWA was installed')
            localStorage.setItem('pwa-prompt-installed', 'true')
        }

        globalThis.addEventListener('appinstalled', appInstalledHandler)

        return () => {
            globalThis.removeEventListener('beforeinstallprompt', handler as EventListener)
            globalThis.removeEventListener('appinstalled', appInstalledHandler)
        }
    }, [])

    return null
}
