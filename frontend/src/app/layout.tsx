import React from "react"
import type { Metadata, Viewport } from 'next'
import '../styles/globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { StytchClientProvider } from '@/providers/stytch-provider'
import { CSPostHogProvider } from '@/providers/posthog-provider'

export const metadata: Metadata = {
  title: 'Standard Chartered Bank - Personal, Business & Corporate Banking',
  description: 'Leading international bank serving clients across Asia, Africa and the Middle East. Wealth management, corporate banking, investment banking, trade finance, and cross-border banking solutions for individuals, SMEs, and multinational corporations.',
  keywords:
    'Standard Chartered, Standard Chartered Bank, international banking, cross-border banking, wealth management, corporate banking, investment banking, private banking, priority banking, retail banking, personal banking, business banking, SME banking, trade finance, foreign exchange, FX trading, cash management, transaction banking, emerging markets, frontier markets, Asia banking, Africa banking, Middle East banking, multinational banking, institutional banking, treasury services, corporate finance, sustainable finance, Islamic banking, Shariah-compliant banking, digital banking, online banking, mobile banking',
  openGraph: {
    title: 'Standard Chartered - International Banking Solutions',
    description: 'Leading international bank connecting businesses and individuals across Asia, Africa and the Middle East with comprehensive banking and financial services',
    type: 'website',
    url: 'https://www.standardchartered.com',
  },
  robots: 'index, follow',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    shortcut: '/favicon.ico',
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

        {/* Load Stytch script - disabled for testing */}
        {/* <script src="https://js.stytch.com/stytch.js" defer /> */}
      </head>
      <body className="bg-background text-foreground antialiased" style={{ colorScheme: 'light' }}>
        <StytchClientProvider>
          <CSPostHogProvider>
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
          </CSPostHogProvider>
        </StytchClientProvider>
      </body>
    </html>
  )
}
