'use client'

import { useEffect, useRef } from 'react'

export function TradingViewTicker() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptLoaded = useRef(false)

  useEffect(() => {
    if (scriptLoaded.current || !containerRef.current) return

    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js'
    script.async = true
    
    document.head.appendChild(script)
    scriptLoaded.current = true

    return () => {
      // Cleanup if needed
    }
  }, [])

  return (
    <div className="w-full overflow-hidden bg-white" ref={containerRef}>
      <div 
        dangerouslySetInnerHTML={{
          __html: '<tv-ticker-tape symbols="FOREXCOM:SPXUSD,FOREXCOM:NSXUSD,FOREXCOM:DJI,FX:EURUSD,BITSTAMP:BTCUSD,BITSTAMP:ETHUSD,CMCMARKETS:GOLD,COINBASE:BTCUSD,NSE:BANKNIFTY,BSE:SENSEX,ECONOMICS:USBCOI,NASDAQ:AAPL,NASDAQ:TSLA,NASDAQ:NVDA,NASDAQ:MSFT"></tv-ticker-tape>'
        }}
      />
    </div>
  )
}
