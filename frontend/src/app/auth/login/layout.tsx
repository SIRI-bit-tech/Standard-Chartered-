import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login - Standard Chartered Online Banking',
  description: 'Securely access your Standard Chartered account. Login to manage your personal banking, business accounts, wealth management, and international banking services online.',
  keywords: 'Standard Chartered login, online banking login, secure banking access, internet banking, mobile banking login, digital banking, bank account access, Standard Chartered sign in',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
