'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { colors } from '@/types'
import type { AdminSupportTicket, SupportAgent, TicketReply } from '@/types'
import { useAdminRealtime } from '@/hooks/use-admin-realtime'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function StatusPill({ status }: { status: AdminSupportTicket['status'] }) {
  const map: Record<AdminSupportTicket['status'], { bg: string; text: string }> = {
    open: { bg: '#FFF9E6', text: '#D48A00' },
    in_progress: { bg: '#E6F2FF', text: '#0066CC' },
    waiting_customer: { bg: '#F3E8FF', text: '#7C3AED' },
    resolved: { bg: '#E9F7EF', text: '#1E7E34' },
    closed: { bg: '#ECEFF1', text: '#607D8B' },
  }
  const cfg = map[status]
  return <span className="px-2 py-1 rounded-full text-xs capitalize" style={{ backgroundColor: cfg.bg, color: cfg.text }}>{status.replace('_',' ')}</span>
}

export function AdminSupportTickets() {
  const UNASSIGNED = '__unassigned__'
  const [items, setItems] = useState<AdminSupportTicket[]>([])
  const [agents, setAgents] = useState<SupportAgent[]>([])
  const [q, setQ] = useState('')
  const [active, setActive] = useState<AdminSupportTicket | null>(null)
  const [replies, setReplies] = useState<TicketReply[]>([])
  const [replyText, setReplyText] = useState('')

  async function load() {
    try {
      const res = await apiClient.get<{ success: boolean; data: AdminSupportTicket[] }>('/admin/support/tickets?limit=50')
      if (res?.success) setItems(res.data)
    } catch {}
  }
  async function loadAgents() {
    try {
      const res = await apiClient.get<{ success: boolean; data: SupportAgent[] }>('/admin/support/agents')
      if (res?.success) setAgents(res.data)
    } catch {}
  }
  async function loadDetail(id: string) {
    try {
      const msgs = await apiClient.get<{ success: boolean; data: TicketReply[] }>(`/admin/support/tickets/${id}/replies`)
      if (msgs?.success) setReplies(msgs.data)
    } catch {}
  }
  useEffect(() => {
    load()
    loadAgents()
  }, [])
  useAdminRealtime('admin:support', () => {
    load()
    if (active) loadDetail(active.id)
  })

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return items
    return items.filter((t) => {
      const hay = `${t.ticket_number} ${t.subject} ${t.status} ${t.priority} ${t.user_email || ''} ${t.category || ''}`.toLowerCase()
      return hay.includes(term)
    })
  }, [q, items])

  async function assignTicket(id: string, agentId: string | null) {
    await apiClient.put(`/admin/support/tickets/${id}/assign`, { agent_id: agentId })
    await load()
    if (active?.id === id) await loadDetail(id)
  }
  async function updateStatus(id: string, status: AdminSupportTicket['status']) {
    await apiClient.put(`/admin/support/tickets/${id}/status`, { status })
    await load()
    if (active?.id === id) await loadDetail(id)
  }
  async function sendReply(id: string) {
    if (!replyText.trim()) return
    const body = { message: replyText }
    await apiClient.post(`/admin/support/tickets/${id}/replies`, body)
    setReplyText('')
    await loadDetail(id)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>Support Tickets</h1>
        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>View, assign and respond in real time.</p>
      </div>
      <div className="flex items-center gap-3">
        <Input placeholder="Search tickets..." value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: colors.border }}>
          <table className="w-full text-sm">
            <thead className="bg-[#F8F9FA]">
              <tr className="text-muted-foreground">
                <th className="text-left py-3 px-4 w-[46%]">Ticket</th>
                <th className="text-left py-3 px-4 w-[22%]">Requester</th>
                <th className="text-left py-3 px-4 w-[14%]">Assigned</th>
                <th className="text-left py-3 px-4 w-[10%]">Status</th>
                <th className="text-left py-3 px-4 w-[8%]">Priority</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  className="border-t hover:bg-[#FAFBFC] transition-colors cursor-pointer"
                  style={{ borderColor: colors.borderLight }}
                  onClick={()=>{ setActive(t); loadDetail(t.id) }}
                >
                  <td className="py-3 px-4 align-top">
                    <div className="font-medium truncate pr-1">#{t.ticket_number} • {t.subject}</div>
                    <div className="text-xs text-muted-foreground">{t.category || 'General'}</div>
                  </td>
                  <td className="py-3 px-4 align-top">
                    <div className="text-sm truncate">{t.user_name || t.user_email || t.user_id}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                  </td>
                  <td className="py-3 px-4 text-xs align-top truncate">{t.assigned_to_name || 'Unassigned'}</td>
                  <td className="py-3 px-4 align-top"><StatusPill status={t.status} /></td>
                  <td className="py-3 px-4 capitalize align-top">{t.priority}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="py-6 px-4 text-muted-foreground" colSpan={5}>No tickets</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border bg-white p-5 space-y-4 min-h-[360px]" style={{ borderColor: colors.border }}>
          {!active && <div className="text-sm text-muted-foreground">Select a ticket to view details</div>}
          {active && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">#{active.ticket_number} • {active.subject}</div>
                  <div className="text-xs text-muted-foreground truncate">{active.user_name || active.user_email} • {active.category || 'General'}</div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Select value={active.assigned_to_id ?? UNASSIGNED} onValueChange={(v)=>assignTicket(active.id, v === UNASSIGNED ? null : v)}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Assign agent" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={active.status} onValueChange={(v:any)=>updateStatus(active.id, v)}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Set status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting_customer">Waiting Customer</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-sm rounded border p-3 bg-[#FCFDFE]" style={{ borderColor: colors.borderLight }}>
                {active.description || 'No description provided.'}
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold">Conversation</div>
                <div className="space-y-3 max-h-[280px] overflow-auto rounded border p-3" style={{ borderColor: colors.borderLight }}>
                  {replies.map(r => (
                    <div key={r.id} className="text-sm">
                      <div className="font-medium">{r.author_name || r.author_id}</div>
                      <div className="text-muted-foreground break-words">{r.message}</div>
                      <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                  {replies.length === 0 && <div className="text-sm text-muted-foreground">No messages yet</div>}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Type reply…" value={replyText} onChange={(e)=>setReplyText(e.target.value)} />
                  <button className="px-3 rounded text-white shrink-0" style={{ backgroundColor: colors.primary }} onClick={()=>sendReply(active.id)}>Send</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
