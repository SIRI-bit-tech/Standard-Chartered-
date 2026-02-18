'use client'
import { useEffect } from 'react'

export function ChatWidget() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const originalConsoleError = console.error
    const dev = process.env.NODE_ENV !== 'production'
    if (dev) {
      console.error = (...args: any[]) => {
        try {
          if (args.length === 1 && args[0] === true) return
        } catch {}
        originalConsoleError(...args)
      }
    }
    if (document.getElementById('tawk-script-loader')) return
    ;(window as any).Tawk_API = (window as any).Tawk_API || {}
    ;(window as any).Tawk_LoadStart = new Date()
    const s1 = document.createElement('script')
    s1.id = 'tawk-script-loader'
    s1.async = true
    s1.src = 'https://embed.tawk.to/6995390798996e1c3b753a5e/1jhnedi1u'
    s1.charset = 'UTF-8'
    s1.crossOrigin = 'anonymous'
    const s0 = document.getElementsByTagName('script')[0] || document.head.firstChild
    if (s0 && s0.parentNode) {
      s0.parentNode.insertBefore(s1, s0)
    } else {
      document.head.appendChild(s1)
    }
    return () => {
      if (dev) {
        console.error = originalConsoleError
      }
    }
  }, [])
  return null
}
