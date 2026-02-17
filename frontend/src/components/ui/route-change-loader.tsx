'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useLoadingStore } from '@/lib/store'

export function RouteChangeLoader() {
  const pathname = usePathname()
  const { show, hide } = useLoadingStore()
  const timer = useRef<number | null>(null)
  const FALLBACK_HIDE_MS = 9000

  useEffect(() => {
    show()
    if (timer.current) {
      window.clearTimeout(timer.current)
    }
    timer.current = window.setTimeout(() => {
      hide()
      timer.current = null
    }, 600)
    const fallback = window.setTimeout(() => {
      hide()
    }, FALLBACK_HIDE_MS)
    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current)
        timer.current = null
      }
      window.clearTimeout(fallback)
    }
  }, [pathname])

  return null
}
