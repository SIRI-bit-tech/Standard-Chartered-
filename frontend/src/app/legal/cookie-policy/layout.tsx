import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy - How We Use Cookies | SCIB',
  description: 'SCIB cookie policy explains how we use cookies and similar technologies on our website. Manage your cookie preferences and learn about different types of cookies we use.',
  keywords: 'cookie policy, cookies, website cookies, tracking cookies, cookie preferences, cookie consent, privacy cookies, browser cookies, cookie management, cookie settings',
}

export default function CookiePolicyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
