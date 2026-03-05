'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export function PWAInstaller() {
    useEffect(() => {
        const handler = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault()

            // Throttling: Check if we've shown this prompt recently (e.g., in the last 24 hours)
            const lastShown = localStorage.getItem('pwa-prompt-last-shown')
            const now = Date.now()
            const ONE_DAY = 24 * 60 * 60 * 1000

            if (lastShown && now - parseInt(lastShown) < ONE_DAY) {
                return
            }

            // Also check if already installed (though browser usually handles this, double check)
            if (window.matchMedia('(display-mode: standalone)').matches) {
                return
            }

            // Notify user they can install
            toast("Install SC Banking App", {
                description: "Install our app for a better banking experience offline.",
                action: {
                    label: "Install",
                    onClick: () => {
                        e.prompt()
                        e.userChoice.then((choiceResult: any) => {
                            if (choiceResult.outcome === 'accepted') {
                                console.log('User accepted the install prompt')
                                localStorage.setItem('pwa-prompt-last-shown', (now + ONE_DAY * 30).toString()) // Don't show again for a month
                            }
                        })
                    },
                },
                onAutoClose: () => {
                    localStorage.setItem('pwa-prompt-last-shown', now.toString())
                },
                onDismiss: () => {
                    localStorage.setItem('pwa-prompt-last-shown', now.toString())
                },
                duration: 10000,
            })
        }

        window.addEventListener('beforeinstallprompt', handler)

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed')
            localStorage.setItem('pwa-prompt-installed', 'true')
        })

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    return null
}
