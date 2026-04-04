import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us - Our Heritage & Values | Standard Chartered',
  description: 'Learn about Standard Chartered history since 1853, our core values, global presence across 60 markets, and commitment to driving commerce and prosperity through diversity.',
  keywords: 'about Standard Chartered, bank history, company values, corporate information, global banking, international bank, banking heritage, company profile, corporate values, diversity and inclusion',
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
