import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Careers - Join Standard Chartered Bank | Global Banking Jobs',
  description: 'Build your career with Standard Chartered. Explore banking jobs, graduate programs, internships, and early career opportunities across 60 markets in Asia, Africa, and the Middle East.',
  keywords: 'banking careers, Standard Chartered jobs, banking jobs, graduate programs, internships, early careers, financial services careers, international banking careers, diversity and inclusion, career opportunities',
}

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
