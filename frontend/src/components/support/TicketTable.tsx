import Link from 'next/link'
import type { SupportTicket } from '@/types'
import { colors } from '@/types'

function StatusPill({ status }: { status: SupportTicket['status'] }) {
  const map: Record<SupportTicket['status'], { bg: string; text: string }> = {
    open: { bg: '#FFF9E6', text: '#D48A00' },
    in_progress: { bg: '#E6F2FF', text: '#0066CC' },
    waiting_customer: { bg: '#F3E8FF', text: '#7C3AED' },
    resolved: { bg: '#E9F7EF', text: '#1E7E34' },
    closed: { bg: '#ECEFF1', text: '#607D8B' },
  }
  const cfg = map[status]
  return (
    <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: cfg.bg, color: cfg.text }}>
      {status.replace('_', ' ')}
    </span>
  )
}

export function TicketTable({ items }: { items: SupportTicket[] }) {
  return (
    <div className="rounded-xl border bg-white" style={{ borderColor: colors.border }}>
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold">My Recent Tickets</h3>
        <Link href="/dashboard/support?t=tickets" className="text-xs font-medium" style={{ color: colors.primary }}>
          View all
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left py-2 px-4">Ticket ID</th>
              <th className="text-left py-2 px-4">Subject</th>
              <th className="text-left py-2 px-4">Date Created</th>
              <th className="text-left py-2 px-4">Status</th>
              <th className="text-left py-2 px-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-t" style={{ borderColor: colors.borderLight }}>
                <td className="py-3 px-4">
                  <Link href={`/dashboard/support/tickets/${t.id}`} className="text-primary">
                    #{t.ticket_number}
                  </Link>
                </td>
                <td className="py-3 px-4">{t.subject}</td>
                <td className="py-3 px-4">{new Date(t.created_at).toLocaleDateString()}</td>
                <td className="py-3 px-4">
                  <StatusPill status={t.status} />
                </td>
                <td className="py-3 px-4">
                  <Link href={`/dashboard/support/tickets/${t.id}`} className="text-primary">
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="py-6 px-4 text-muted-foreground" colSpan={5}>
                  No recent tickets
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
