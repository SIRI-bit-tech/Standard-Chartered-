'use client'

import { useEffect, useRef, useState } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { useLoadingStore } from '@/lib/store'

export function BrandLoader({ size = 160 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }}>
      <DotLottieReact
        src="https://lottie.host/c465a8dc-5928-43d7-8a91-3a3c49bd0d39/KbXu6W3alp.lottie"
        loop
        autoplay
        style={{ width: '100%', height: '100%' }}
      />
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
