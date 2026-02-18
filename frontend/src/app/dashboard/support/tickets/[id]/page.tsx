'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { SupportTicketDetail as TicketDetail } from '@/components/support/SupportTicketDetail'
import { colors } from '@/types'

export default function SupportTicketDetailPage() {
  const params = useParams<{ id?: string }>()
  const ticketId = params.id
  if (!ticketId) {
    return <div className="p-4 text-sm text-muted-foreground">Invalid ticket</div>
  }
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>Support Ticket</h1>
        <Link href="/dashboard/support" className="text-sm" style={{ color: colors.primary }}>Back to Support</Link>
      </div>
      <TicketDetail ticketId={ticketId} />
    </div>
  )
}
