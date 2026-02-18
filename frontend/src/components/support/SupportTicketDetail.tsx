import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import type { SupportTicketDetail, TicketReply } from '@/types'
import { colors } from '@/types'
import { Input } from '@/components/ui/input'

export function SupportTicketDetail({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null)
  const [replies, setReplies] = useState<TicketReply[]>([])
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const t = await apiClient.get<{ success: boolean; data: SupportTicketDetail }>(`/api/v1/support/tickets/${ticketId}`)
      if (t?.success) setTicket(t.data)
    } catch {}
    try {
      const r = await apiClient.get<{ success: boolean; data: TicketReply[] }>(`/api/v1/support/tickets/${ticketId}/replies`)
      if (r?.success) setReplies(r.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [ticketId])

  async function sendReply() {
    if (!replyText.trim()) return
    setSending(true)
    try {
      await apiClient.post(`/api/v1/support/tickets/${ticketId}/replies`, { message: replyText })
      setReplyText('')
      await load()
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-4" style={{ borderColor: colors.border }}>
        <div className="text-sm text-muted-foreground">Loading ticket…</div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="rounded-xl border bg-white p-4" style={{ borderColor: colors.border }}>
        <div className="text-sm text-muted-foreground">Ticket not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4" style={{ borderColor: colors.border }}>
        <div className="text-sm font-semibold">#{ticket.ticket_number} • {ticket.subject}</div>
        <div className="text-xs text-muted-foreground">{ticket.category || 'General'} • {new Date(ticket.created_at).toLocaleString()}</div>
        <div className="mt-3 text-sm rounded border p-3" style={{ borderColor: colors.borderLight }}>
          {ticket.description || 'No description provided.'}
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4 space-y-3" style={{ borderColor: colors.border }}>
        <div className="text-sm font-semibold">Conversation</div>
        <div className="space-y-3 max-h-[320px] overflow-auto rounded border p-3" style={{ borderColor: colors.borderLight }}>
          {replies.map((r) => (
            <div key={r.id} className="text-sm">
              <div className="font-medium">{r.author_name || (r.author_id === 'me' ? 'You' : 'Support')}</div>
              <div className="text-muted-foreground break-words">{r.message}</div>
              <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
            </div>
          ))}
          {replies.length === 0 && <div className="text-sm text-muted-foreground">No messages yet</div>}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Type a reply…" value={replyText} onChange={(e)=>setReplyText(e.target.value)} />
          <button disabled={sending} className="px-3 rounded text-white disabled:opacity-60" style={{ backgroundColor: colors.primary }} onClick={sendReply}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
