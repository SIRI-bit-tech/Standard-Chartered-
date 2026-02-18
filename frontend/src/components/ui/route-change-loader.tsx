'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Spinner } from '@/components/ui/spinner'

export function RouteChangeLoader() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const mounted = useRef(false)
  const timer = useRef<number | null>(null)
  const fallback = useRef<number | null>(null)
  const FALLBACK_HIDE_MS = 9000

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    setVisible(true)
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    if (fallback.current) {
      window.clearTimeout(fallback.current)
      fallback.current = null
    }
    timer.current = window.setTimeout(() => {
      setVisible(false)
      timer.current = null
    }, 600)
    fallback.current = window.setTimeout(() => {
      setVisible(false)
    }, FALLBACK_HIDE_MS)
    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current)
        timer.current = null
      }
      if (fallback.current) {
        window.clearTimeout(fallback.current)
        fallback.current = null
      }
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div className="fixed top-3 right-3 z-[10000] rounded-full bg-white border shadow p-2">
      <Spinner className="text-primary size-4" />
    </div>
  )
}
