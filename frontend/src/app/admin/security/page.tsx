'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { AdminAuditTable } from '@/components/admin/admin-audit-table'
import { Input } from '@/components/ui/input'
import { colors } from '@/types'
import { useAdminRealtime } from '@/hooks/use-admin-realtime'
import type { AdminAuditLog } from '@/types'
 
 export default function AdminSecurityPage() {
   const [items, setItems] = useState<AdminAuditLog[]>([])
   const [q, setQ] = useState('')
 
  async function fetchLogs() {
    try {
      const res = await apiClient.get<AdminAuditLog[] | { success: boolean; data: AdminAuditLog[] }>(
        `/admin/audit-logs?limit=50&offset=0`,
      )
      if (Array.isArray(res)) setItems(res)
      else if ((res as any)?.success && Array.isArray((res as any).data)) setItems((res as any).data)
    } catch (err: any) {
      logger.error('Failed to fetch audit logs', { error: err })
    }
  }
  useEffect(() => {
    fetchLogs()
  }, [])
  useAdminRealtime('admin:dashboard', () => {
    fetchLogs()
  })
 
   const filtered = useMemo(() => {
     const term = q.trim().toLowerCase()
     if (!term) return items
     return items.filter(
       (l) =>
         l.action.toLowerCase().includes(term) ||
         l.admin_email.toLowerCase().includes(term) ||
         l.resource_type.toLowerCase().includes(term) ||
         (l.details || '').toLowerCase().includes(term),
     )
   }, [items, q])
 
   return (
     <div className="space-y-5">
       <div>
         <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
           Security & Audit Logs
         </h1>
         <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
           Review administrative actions and system changes.
         </p>
       </div>
 
       <div className="rounded-xl border bg-white p-4" style={{ borderColor: colors.border }}>
         <Input
           placeholder="Search actions, actor or resource..."
           value={q}
           onChange={(e) => setQ(e.target.value)}
         />
       </div>
 
       <AdminAuditTable items={filtered} />
     </div>
   )
 }
