'use client'

import { useEffect, useRef } from 'react'
import { useLoadingStore } from '@/lib/store'

function isModifiedEvent(event: MouseEvent): boolean {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
}

function findClosestAnchor(el: EventTarget | null): HTMLAnchorElement | null {
  const target = el as HTMLElement | null
  if (!target) return null
  if (target instanceof HTMLAnchorElement) return target
  return (target.closest && target.closest('a')) as HTMLAnchorElement | null
}

export function LinkClickLoader() {
  const { show, hide } = useLoadingStore()
  const fallbackTimer = useRef<number | null>(null)
  const FALLBACK_HIDE_MS = 9000

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return
      if (isModifiedEvent(e)) return
      const anchor = findClosestAnchor(e.target)
      if (!anchor) return
      if (anchor.target === '_blank') return
      const href = anchor.getAttribute('href') || ''
      if (!href) return
      const isInternal =
        href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/api')
      if (!isInternal) return
      if (href.startsWith('#')) return
      try {
        show()
        if (fallbackTimer.current) {
          window.clearTimeout(fallbackTimer.current)
        }
        fallbackTimer.current = window.setTimeout(() => {
          try {
            hide()
          } catch {}
          fallbackTimer.current = null
        }, FALLBACK_HIDE_MS)
      } catch {}
    }
    document.addEventListener('click', onClick, { capture: true })
    return () => {
      document.removeEventListener('click', onClick, { capture: true } as any)
      if (fallbackTimer.current) {
        window.clearTimeout(fallbackTimer.current)
        fallbackTimer.current = null
      }
    }
  }, [show, hide])

  return null
}
