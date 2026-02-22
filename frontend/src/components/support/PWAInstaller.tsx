'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export function PWAInstaller() {
    useEffect(() => {
        const handler = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault()

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
                            }
                        })
                    },
                },
                duration: 10000,
            })
        }

        window.addEventListener('beforeinstallprompt', handler)

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed')
        })

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    return null
}
