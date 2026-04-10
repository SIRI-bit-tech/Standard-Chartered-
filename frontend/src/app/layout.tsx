import React from "react"
import type { Metadata, Viewport } from 'next'
import '../styles/globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { StytchClientProvider } from '@/providers/stytch-provider'

export const metadata: Metadata = {
  title: 'SCIB Bank - Personal, Business & Corporate Banking',
  description: 'Leading international bank serving clients across Asia, Middle East, United States and worldwide markets. Wealth management, corporate banking, investment banking, trade finance, and cross-border banking solutions for individuals, SMEs, and multinational corporations.',
  keywords:
    'SCIB, SCIB Bank, international banking, worldwide banking, United States banking, cross-border banking, wealth management, corporate banking, investment banking, private banking, priority banking, retail banking, personal banking, business banking, SME banking, trade finance, foreign exchange, FX trading, cash management, transaction banking, global finance, emerging markets, Asia banking, Middle East banking, US banking, worldwide banking services, multinational banking, institutional banking, treasury services, corporate finance, sustainable finance, digital banking, online banking, mobile banking, international money transfer, global bank, best bank worldwide',
  openGraph: {
    title: 'SCIB - International Banking Solutions',
    description: 'Leading international bank connecting businesses and individuals across Asia and the Middle East with comprehensive banking and financial services',
    type: 'website',
    url: 'https://www.standardcharteredibank.com',
  },
  robots: 'index, follow',
  icons: {
    icon: [
      { url: '/scib_favicon.ico', sizes: 'any' },
      { url: '/scib_favicon_16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/scib_favicon_32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/scib_favicon_48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/scib_favicon_64x64.png', sizes: '64x64', type: 'image/png' },
      { url: '/scib_favicon_128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/scib_favicon_256x256.png', sizes: '256x256', type: 'image/png' }
    ],
    apple: [
      { url: '/scib_favicon_192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/scib_favicon_512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    shortcut: '/scib_favicon.ico',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0073CF',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="light" style={{ colorScheme: 'light' }}>
      <head>
        <meta charSet="utf-8" />
        {/* Force light color scheme — prevents phone dark mode from inverting the app */}
        <meta name="color-scheme" content="light" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-config" content="/none" />
        <meta name="msapplication-TileColor" content="#0073CF" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Explicitly disable PWA features on all devices */}
        <meta name="mobile-web-app-capable" content="no" />
        <meta name="apple-mobile-web-app-capable" content="no" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Load Stytch script */}
        <script src="https://js.stytch.com/stytch.js" defer />
      </head>
      <body className="bg-background text-foreground antialiased" style={{ colorScheme: 'light' }}>
        <StytchClientProvider>
          <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              forcedTheme="light"
              disableTransitionOnChange
            >
              {children}
              <Toaster position="top-center" richColors />
            </ThemeProvider>
        </StytchClientProvider>
      </body>
    </html>
  )
}
