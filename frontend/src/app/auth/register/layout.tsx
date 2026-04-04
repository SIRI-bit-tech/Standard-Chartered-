import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Open Account - Standard Chartered Bank Registration',
  description: 'Open a Standard Chartered bank account online. Register for personal banking, business accounts, wealth management services with competitive rates and global banking access.',
  keywords: 'open bank account, Standard Chartered registration, new account, online account opening, personal banking account, business account, international banking, bank account signup',
}

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
