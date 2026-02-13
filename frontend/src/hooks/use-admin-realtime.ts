'use client'

import { useEffect, useRef } from 'react'
import * as Ably from 'ably'
import { API_BASE_URL } from '@/constants'

export function useAdminRealtime(channelName: string, onUpdate: (payload: any) => void) {
  const clientRef = useRef<Ably.Realtime | null>(null)
  const channelRef = useRef<Ably.Types.RealtimeChannelCallbacks | null>(null)

  useEffect(() => {
    let cancelled = false
    const adminId = typeof window !== 'undefined' ? localStorage.getItem('admin_id') : null
    if (!adminId) return

    const connect = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/system/settings?admin_id=${adminId}`)
        const json = await res.json()
        const enabled = json?.success && json.data?.real_time_enabled
        if (!enabled || cancelled) return

        const client = new Ably.Realtime({
          authUrl: `${API_BASE_URL}/admin/realtime/token?admin_id=${adminId}`,
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
