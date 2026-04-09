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
    <div className="w-full overflow-hidden bg-white relative" ref={containerRef} style={{ maxHeight: '50px' }}>
      <div 
        dangerouslySetInnerHTML={{
          __html: '<tv-ticker-tape symbols="FOREXCOM:SPXUSD,FOREXCOM:NSXUSD,FOREXCOM:DJI,FX:EURUSD,BITSTAMP:BTCUSD,BITSTAMP:ETHUSD,CMCMARKETS:GOLD,COINBASE:BTCUSD,NSE:BANKNIFTY,BSE:SENSEX,ECONOMICS:USBCOI,NASDAQ:AAPL,NASDAQ:TSLA,NASDAQ:NVDA,NASDAQ:MSFT"></tv-ticker-tape>'
        }}
      />
      <style jsx global>{`
        tv-ticker-tape {
          height: 50px !important;
        }
        tv-ticker-tape iframe {
          height: 50px !important;
        }
        /* Hide TradingView branding */
        tv-ticker-tape .tradingview-widget-copyright,
        tv-ticker-tape a[href*="tradingview"],
        tv-ticker-tape div[style*="font-size: 13px"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          height: 0 !important;
          overflow: hidden !important;
        }
      `}</style>
    </div>
  )
}
