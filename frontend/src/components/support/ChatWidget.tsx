'use client'
import { useEffect } from 'react'

export function ChatWidget() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const tawkApi = (window as any).Tawk_API

    // If script is already loaded, ensure style is applied and show it
    if (tawkApi && typeof tawkApi.showWidget === 'function') {
      tawkApi.customStyle = {
        visibility: {
          desktop: { xOffset: 20, yOffset: 20 },
          mobile: { xOffset: 15, yOffset: 90 }
        }
      }
      tawkApi.showWidget()
    }

    if (document.getElementById('tawk-script-loader')) {
      return () => {
        const tawkApiUnmount = (window as any).Tawk_API
        if (tawkApiUnmount && typeof tawkApiUnmount.hideWidget === 'function') {
          tawkApiUnmount.hideWidget()
        }
      }
    }

    try {
      const tawkObj = (window as any).Tawk_API || {}
        ; (window as any).Tawk_API = tawkObj

      // Move chat bubble up to avoid overlapping with bottom navbar
      tawkObj.customStyle = {
        visibility: {
          desktop: { xOffset: 20, yOffset: 20 },
          mobile: { xOffset: 15, yOffset: 90 } // Lifted up for mobile navbar
        }
      }

        ; (window as any).Tawk_LoadStart = new Date()
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
    } catch { }

    return () => {
      const tawkApiUnmount = (window as any).Tawk_API
      if (tawkApiUnmount && typeof tawkApiUnmount.hideWidget === 'function') {
        tawkApiUnmount.hideWidget()
      }
    }
  }, [])

  return null
}
