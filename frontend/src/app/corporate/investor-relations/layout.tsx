import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Investor Relations - Financial Reports & Stock Information | Standard Chartered',
  description: 'Access Standard Chartered investor relations, financial reports, annual reports, dividend information, stock price, earnings results, and shareholder information for LSE listed shares.',
  keywords: 'investor relations, financial reports, annual reports, stock price, dividends, earnings, shareholder information, financial results, corporate governance, investor presentations, LSE stock',
}

export default function InvestorRelationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
