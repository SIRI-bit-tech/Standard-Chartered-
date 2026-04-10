import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Open Account - SCIB Bank Registration',
  description: 'Open a SCIB bank account online. Register for personal banking, business accounts, wealth management services with competitive rates and global banking access.',
  keywords: 'open bank account, SCIB registration, new account, online account opening, personal banking account, business account, international banking, bank account signup',
}

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
