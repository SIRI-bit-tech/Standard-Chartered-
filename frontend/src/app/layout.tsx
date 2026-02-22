import React from "react"
import type { Metadata, Viewport } from 'next'
import '../styles/globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'Standard Chartered Bank - Personal, Business & Corporate Banking',
  description: 'Standard Chartered is a leading international banking group connecting corporate, institutional and affluent clients, as well as individuals and SMEs, to a network offering sustainable growth opportunities across Asia, Africa and the Middle East.',
  keywords:
    'Standard Chartered, Standard Chartered Bank, global banking, international banking, corporate banking, institutional banking, retail banking, personal banking, private banking, priority banking, wealth management, sustainable finance, Asia banking, Africa banking, Middle East banking, cross-border banking',
  openGraph: {
    title: 'Standard Chartered Banking Platform',
    description: 'Secure, professional online banking with multi-currency support',
    type: 'website',
    url: 'https://www.standardchartered.com',
  },
  robots: 'index, follow',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.pnkg', sizes: '16x16', type: 'image/png' },
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
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-background text-foreground antialiased" style={{ colorScheme: 'light' }}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          forcedTheme="light"
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
