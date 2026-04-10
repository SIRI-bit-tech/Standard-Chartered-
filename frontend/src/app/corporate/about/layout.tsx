import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us - Our Heritage & Values | SCIB',
  description: 'Learn about SCIB history since 1853, our core values, global presence across 60 markets, and commitment to driving commerce and prosperity through diversity.',
  keywords: 'about SCIB, bank history, company values, corporate information, global banking, international bank, banking heritage, company profile, corporate values, diversity and inclusion',
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
