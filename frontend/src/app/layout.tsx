import React from "react"
import type { Metadata, Viewport } from 'next'
import '../styles/globals.css'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'Standard Chartered Banking Platform',
  description: 'Secure, professional online banking with multi-currency support',
  keywords:
    'banking, online banking, transfers, loans, accounts, digital banking',
  openGraph: {
    title: 'Standard Chartered Banking Platform',
    description: 'Secure, professional online banking with multi-currency support',
    type: 'website',
    url: 'https://www.standardchartered.com',
  },
  robots: 'index, follow',
  icons: {
    icon: '/favicon.ico',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
