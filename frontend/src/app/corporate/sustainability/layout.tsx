import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sustainability & ESG - Net Zero Commitment | SCIB',
  description: 'SCIB commitment to sustainability, ESG, and net zero by 2050. Learn about our sustainable finance initiatives, responsible business practices, and inclusive growth programs.',
  keywords: 'sustainability, ESG, net zero, sustainable finance, green finance, climate finance, responsible banking, environmental sustainability, social responsibility, corporate sustainability, TCFD, carbon neutral',
}

export default function SustainabilityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
