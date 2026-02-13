 'use client'
 
 import { useEffect, useState } from 'react'
 import { apiClient } from '@/lib/api-client'
 import { logger } from '@/lib/logger'
 import { AdminAccountTable } from '@/components/admin/admin-account-table'
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
 
 interface AdminAccountRow {
   id: string
   account_number: string
   type: string
   currency: string
   balance: number
   status: string
   user: { id: string; name: string; display_id: string }
   created_at?: string | null
 }
 
 export default function AdminAccountsPage() {
   const [items, setItems] = useState<AdminAccountRow[]>([])
   const [filters, setFilters] = useState({
     q: '',
     status: 'all' as const,
     type: 'all' as const,
   })
 
  async function fetchAccounts() {
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
        type_filter: filters.type,
        page: '1',
        page_size: '10',
      })
      const res = await apiClient.get<{ success: boolean; data: { items: AdminAccountRow[] } }>(
        `/admin/accounts/list?${qs.toString()}`,
      )
      if (res.success) setItems(res.data.items)
    } catch (err: any) {
      logger.error('Failed to fetch accounts list', { error: err })
    }
  }
  useEffect(() => {
    const t = setTimeout(fetchAccounts, 250)
    return () => clearTimeout(t)
  }, [filters.q, filters.status, filters.type])
  useAdminRealtime('admin:accounts', () => {
    fetchAccounts()
  })
 
   return (
     <div className="space-y-5">
       <div>
         <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
           Accounts
         </h1>
         <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
           View and monitor all customer accounts.
         </p>
       </div>
 
       <div className="rounded-xl border bg-white p-4" style={{ borderColor: colors.border }}>
         <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
           <div className="relative flex-1">
             <Input
               placeholder="Search by user or account number..."
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
                 <SelectItem value="active">Active</SelectItem>
                 <SelectItem value="frozen">Frozen</SelectItem>
                 <SelectItem value="closed">Closed</SelectItem>
                 <SelectItem value="pending">Pending</SelectItem>
               </SelectContent>
             </Select>
             <Select value={filters.type} onValueChange={(v: any) => setFilters({ ...filters, type: v })}>
               <SelectTrigger className="w-[140px]">
                 <SelectValue placeholder="Type: All" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Type: All</SelectItem>
                 <SelectItem value="checking">Checking</SelectItem>
                 <SelectItem value="savings">Savings</SelectItem>
                 <SelectItem value="crypto">Crypto</SelectItem>
               </SelectContent>
             </Select>
           </div>
         </div>
       </div>
 
       <AdminAccountTable items={items} />
     </div>
   )
 }
