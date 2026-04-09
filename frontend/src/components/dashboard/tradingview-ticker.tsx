'use client'

import { useEffect, useRef } from 'react'

export function TradingViewTicker() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear any existing content
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbols: [
        {
          proName: 'FOREXCOM:SPXUSD',
          title: 'S&P 500',
        },
        {
          proName: 'FOREXCOM:NSXUSD',
          title: 'US 100',
        },
        {
          proName: 'FX_IDC:EURUSD',
          title: 'EUR to USD',
        },
        {
          proName: 'BITSTAMP:BTCUSD',
          title: 'Bitcoin',
        },
        {
          proName: 'BITSTAMP:ETHUSD',
          title: 'Ethereum',
        },
        {
          description: 'Gold',
          proName: 'OANDA:XAUUSD',
        },
        {
          description: 'Crude Oil',
          proName: 'TVC:USOIL',
        },
      ],
      showSymbolLogo: true,
      colorTheme: 'light',
      isTransparent: false,
      displayMode: 'adaptive',
      locale: 'en',
    })

    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [])

  return (
    <div className="tradingview-widget-container w-full overflow-hidden" ref={containerRef}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  )
}
