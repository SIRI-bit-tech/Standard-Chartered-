'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SessionTimeoutModal } from '@/components/auth/session-timeout-modal'
import { apiClient } from '@/lib/api-client'

function decodeJwtExp(token: string | null): number | null {
  try {
    if (!token) return null
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(atob(parts[1]))
    const exp = typeof payload.exp === 'number' ? payload.exp : null
    return exp
  } catch {
    return null
  }
}

export function SessionKeeper() {
  const [modalOpen, setModalOpen] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const idleTimer = useRef<number | null>(null)
  const countdownTimer = useRef<number | null>(null)
  const refreshTimer = useRef<number | null>(null)
  const lastActiveRef = useRef<number>(Date.now())

  const IDLE_TIMEOUT_MS = 25 * 60 * 1000 // 25 minutes inactivity
  const WARNING_SECONDS = 60 // 60-second grace period
  const REFRESH_SKEW_SECONDS = 60 // refresh 60s before expiry

  const clearTimers = useCallback(() => {
    if (idleTimer.current) window.clearInterval(idleTimer.current)
    if (countdownTimer.current) window.clearInterval(countdownTimer.current)
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current)
    idleTimer.current = null
    countdownTimer.current = null
    refreshTimer.current = null
  }, [])

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current)
    const access = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const exp = decodeJwtExp(access)
    if (!exp) return
    const nowSec = Math.floor(Date.now() / 1000)
    const delayMs = Math.max(0, (exp - nowSec - REFRESH_SKEW_SECONDS) * 1000)
    refreshTimer.current = window.setTimeout(async () => {
      try {
        const refresh_token = localStorage.getItem('refresh_token')
        if (!refresh_token) return
        const res = await fetch(`/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token }),
        })
        if (res.ok) {
          const data = await res.json()
          const newAccess = data?.access_token
          const newRefresh = data?.refresh_token
          if (newAccess) {
            localStorage.setItem('access_token', newAccess)
            if (newRefresh) localStorage.setItem('refresh_token', newRefresh)
            document.cookie = `accessToken=${newAccess}; path=/; max-age=3600; secure; samesite=strict`
            localStorage.setItem('access_token_updated_at', String(Date.now()))
            apiClient.setAuthToken(newAccess)
            scheduleRefresh()
          }
        }
      } catch {
        // ignore; api-client will handle 401 later
      }
    }) as unknown as number
  }, [])

  const resetIdle = useCallback(() => {
    lastActiveRef.current = Date.now()
    if (modalOpen) {
      setModalOpen(false)
      if (countdownTimer.current) window.clearInterval(countdownTimer.current)
      setCountdown(WARNING_SECONDS)
    }
  }, [modalOpen])

  const startIdleWatch = useCallback(() => {
    if (idleTimer.current) window.clearInterval(idleTimer.current)
    idleTimer.current = window.setInterval(() => {
      const idleMs = Date.now() - lastActiveRef.current
      if (!modalOpen && idleMs >= IDLE_TIMEOUT_MS) {
        setModalOpen(true)
        setCountdown(WARNING_SECONDS)
        // Start countdown
        if (countdownTimer.current) window.clearInterval(countdownTimer.current)
        countdownTimer.current = window.setInterval(() => {
          setCountdown((s) => s - 1)
        }, 1000) as unknown as number
      }
    }, 1000) as unknown as number
  }, [IDLE_TIMEOUT_MS, modalOpen])

  const staySignedIn = useCallback(async () => {
    try {
      const refresh_token = localStorage.getItem('refresh_token')
      if (!refresh_token) return logout()
      const res = await fetch(`/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token }),
      })
      if (res.ok) {
        const data = await res.json()
        const newAccess = data?.access_token
        const newRefresh = data?.refresh_token
        if (newAccess) {
          localStorage.setItem('access_token', newAccess)
          if (newRefresh) localStorage.setItem('refresh_token', newRefresh)
          document.cookie = `accessToken=${newAccess}; path=/; max-age=3600; secure; samesite=strict`
            localStorage.setItem('access_token_updated_at', String(Date.now()))
          apiClient.setAuthToken(newAccess)
          setModalOpen(false)
          resetIdle()
          scheduleRefresh()
        } else {
          logout()
        }
      } else {
        logout()
      }
    } catch {
      logout()
    }
  }, [resetIdle, scheduleRefresh])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      localStorage.removeItem('auth-storage')
      document.cookie = 'accessToken=; path=/; max-age=0; samesite=strict'
    } catch {}
    window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}&reason=Session%20expired`
  }, [])

  useEffect(() => {
    // Attach user activity listeners
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    const handler = () => resetIdle()
    events.forEach((ev) => window.addEventListener(ev, handler, { passive: true }))
    startIdleWatch()
    scheduleRefresh()
    return () => {
      clearTimers()
      events.forEach((ev) => window.removeEventListener(ev, handler))
    }
  }, [resetIdle, startIdleWatch, scheduleRefresh, clearTimers])

  useEffect(() => {
    if (!modalOpen) return
    if (countdown <= 0) {
      logout()
    }
  }, [modalOpen, countdown, logout])

  return (
    <SessionTimeoutModal
      open={modalOpen}
      secondsRemaining={countdown}
      onStaySignedIn={staySignedIn}
      onLogout={logout}
    />
  )
}
