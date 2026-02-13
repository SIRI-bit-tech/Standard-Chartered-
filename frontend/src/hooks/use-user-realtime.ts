'use client'

import { useEffect, useRef } from 'react'
import * as Ably from 'ably'
import { API_BASE_URL } from '@/constants'

export function useUserRealtime(channelName: string, onUpdate: (payload: any) => void) {
    const clientRef = useRef<Ably.Realtime | null>(null)
    const channelRef = useRef<Ably.Types.RealtimeChannelCallbacks | null>(null)

    useEffect(() => {
        let cancelled = false
        const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') || localStorage.getItem('accessToken')) : null
        if (!token || !channelName) return
        if (typeof window !== 'undefined' && sessionStorage.getItem('realtimeDisabled') === '1') return

        const connect = async () => {
            try {
                // Pre-check the auth endpoint to avoid repeated Ably logs when backend is not configured
                try {
                    const probe = await fetch(`${API_BASE_URL}/api/v1/profile/realtime/token`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                    if (!probe.ok) {
                        sessionStorage.setItem('realtimeDisabled', '1')
                        return
                    }
                } catch {
                    sessionStorage.setItem('realtimeDisabled', '1')
                    return
                }
                const client = new Ably.Realtime({
                    authUrl: `${API_BASE_URL}/api/v1/profile/realtime/token`,
                    authHeaders: { Authorization: `Bearer ${token}` },
                })
                clientRef.current = client

                const ch = client.channels.get(channelName)
                channelRef.current = ch

                const handler = (m: Ably.Types.Message) => {
                    try {
                        const data = typeof m.data === 'string' ? JSON.parse(m.data as string) : m.data
                        onUpdate(data)
                    } catch {
                        onUpdate(m.data)
                    }
                }

                ch.subscribe('update', handler)
                ch.subscribe('notification', handler)
            } catch { }
        }

        connect()

        return () => {
            cancelled = true
            try {
                channelRef.current?.unsubscribe()
                clientRef.current?.close()
            } catch { }
            channelRef.current = null
            clientRef.current = null
        }
    }, [channelName])
}
