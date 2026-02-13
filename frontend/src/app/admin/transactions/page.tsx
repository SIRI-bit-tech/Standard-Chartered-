 'use client'
 
 import { useEffect, useState } from 'react'
 import { apiClient } from '@/lib/api-client'
 import { logger } from '@/lib/logger'
 import { AdminTransactionsTable } from '@/components/admin/admin-transactions-table'
 import { Input } from '@/components/ui/input'
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select'
import { colors } from '@/types'
import { useAdminRealtime } from '@/hooks/use-admin-realtime'
 
 interface AdminTransactionRow {
   id: string
   description: string
   amount: number
   currency: string
   status: string
   created_at?: string | null
   account_number: string
   user: { id: string; name: string; display_id: string }
 }
 
 export default function AdminTransactionsPage() {
   const [items, setItems] = useState<AdminTransactionRow[]>([])
   const [filters, setFilters] = useState({
     q: '',
     status: 'all' as const,
   })
 
  async function fetchTx() {
    try {
      const adminId = localStorage.getItem('admin_id')
      if (!adminId) {
        window.location.href = '/admin/auth/login'
        return
      }
      const qs = new URLSearchParams({
        admin_id: adminId,
        q: filters.q,
        status: filters.status,
        page: '1',
        page_size: '10',
      })
      const res = await apiClient.get<{ success: boolean; data: { items: AdminTransactionRow[] } }>(
        `/admin/transactions/list?${qs.toString()}`,
      )
      if (res.success) setItems(res.data.items)
    } catch (err: any) {
      logger.error('Failed to fetch transactions list', { error: err })
    }
  }
  useEffect(() => {
    const t = setTimeout(fetchTx, 250)
    return () => clearTimeout(t)
  }, [filters.q, filters.status])
  useAdminRealtime('admin:transactions', () => {
    fetchTx()
  })
 
   return (
     <div className="space-y-5">
       <div>
         <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
           Transactions
         </h1>
         <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
           Monitor transactions across accounts in real-time.
         </p>
       </div>
 
       <div className="rounded-xl border bg-white p-4" style={{ borderColor: colors.border }}>
         <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
           <div className="relative flex-1">
             <Input
               placeholder="Search by description or account..."
               value={filters.q}
               onChange={(e) => setFilters({ ...filters, q: e.target.value })}
             />
           </div>
           <div className="flex flex-wrap gap-2">
             <Select value={filters.status} onValueChange={(v: any) => setFilters({ ...filters, status: v })}>
               <SelectTrigger className="w-[140px]">
                 <SelectValue placeholder="Status: All" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Status: All</SelectItem>
                 <SelectItem value="pending">Pending</SelectItem>
                 <SelectItem value="processing">Processing</SelectItem>
                 <SelectItem value="completed">Completed</SelectItem>
                 <SelectItem value="failed">Failed</SelectItem>
               </SelectContent>
             </Select>
           </div>
         </div>
       </div>
 
       <AdminTransactionsTable items={items} />
     </div>
   )
 }
