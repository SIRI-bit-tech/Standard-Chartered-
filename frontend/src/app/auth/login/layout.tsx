import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login - SCIB Online Banking',
  description: 'Securely access your SCIB account. Login to manage your personal banking, business accounts, wealth management, and international banking services online.',
  keywords: 'SCIB login, online banking login, secure banking access, internet banking, mobile banking login, digital banking, bank account access, SCIB sign in',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
