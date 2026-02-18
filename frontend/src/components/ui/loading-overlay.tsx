'use client'

import { useEffect, useRef, useState } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { useLoadingStore } from '@/lib/store'

export function BrandLoader({ size = 160 }: { size?: number }) {
  const [unavailable, setUnavailable] = useState(false)
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await fetch('/animations/brand-loader.lottie', { method: 'HEAD' })
        if (!cancelled && !res.ok) setUnavailable(true)
      } catch {
        if (!cancelled) setUnavailable(true)
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {!unavailable ? (
        <DotLottieReact
          src="/animations/brand-loader.lottie"
          loop
          autoplay
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <div
          aria-label="Loading"
          style={{
            width: Math.max(32, Math.floor(size * 0.4)),
            height: Math.max(32, Math.floor(size * 0.4)),
            borderRadius: '50%',
            border: '4px solid #E9ECEF',
            borderTopColor: '#0066CC',
            animation: 'brandloader-spin 0.9s linear infinite',
          }}
        />
      )}
      <style>{`@keyframes brandloader-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function LoadingOverlay() {
  const { isLoading } = useLoadingStore()
  const [visible, setVisible] = useState(false)
  const [mountAnim, setMountAnim] = useState(false)
  const startedAtRef = useRef<number | null>(null)
  const hideTimerRef = useRef<number | null>(null)
  const MIN_VISIBLE_MS = 8000

  useEffect(() => {
    try {
      const el = document.getElementById('app-boot-preloader')
      if (el) el.remove()
      document.documentElement.classList.remove('app-preloading')
    } catch {}
  }, [])

  useEffect(() => {
    if (isLoading) {
      setVisible(true)
      setMountAnim(true)
      startedAtRef.current = Date.now()
    } else {
      const now = Date.now()
      const started = startedAtRef.current ?? now
      const elapsed = now - started
      const remain = Math.max(0, MIN_VISIBLE_MS - elapsed)
      setMountAnim(false)
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current)
      }
      hideTimerRef.current = window.setTimeout(() => {
        setVisible(false)
        startedAtRef.current = null
        if (hideTimerRef.current) {
          window.clearTimeout(hideTimerRef.current)
          hideTimerRef.current = null
        }
      }, remain > 0 ? remain : 150)
    }
  }, [isLoading])

  if (!visible) return null

  return (
    <div
      aria-live="polite"
      aria-busy={isLoading}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#ffffff',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 150ms ease',
        opacity: 1
      }}
    >
      <BrandLoader size={160} />
    </div>
  )
}
