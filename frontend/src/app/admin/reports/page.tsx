 'use client'
 
 import { useEffect, useState } from 'react'
 import { apiClient } from '@/lib/api-client'
 import { logger } from '@/lib/logger'
 import { AdminKpiCard } from '@/components/admin/admin-kpi-card'
 import { colors } from '@/types'
 import { Users, ArrowLeftRight, Landmark, ClipboardList } from 'lucide-react'
import { useAdminRealtime } from '@/hooks/use-admin-realtime'
 
 interface AdminStatistics {
   total_users: number
   active_users: number
   total_transfers: number
   pending_transfers: number
   total_deposits: number
   pending_deposits: number
   total_loans: number
   pending_loans: number
   total_virtual_cards: number
   pending_cards: number
 }
 
 export default function AdminReportsPage() {
   const [stats, setStats] = useState<AdminStatistics | null>(null)
 
  async function fetchStats() {
    try {
      const adminId = localStorage.getItem('admin_id')
      if (!adminId) {
        window.location.href = '/admin/auth/login'
        return
      }
      const res = await apiClient.get<{ success: boolean; data: AdminStatistics }>(
        `/admin/statistics?admin_id=${adminId}`,
      )
      if (res.success) setStats(res.data)
    } catch (err: any) {
      logger.error('Failed to fetch admin statistics', { error: err })
    }
  }
  useEffect(() => {
    fetchStats()
  }, [])
  useAdminRealtime('admin:dashboard', () => {
    fetchStats()
  })
 
   return (
     <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
           Reports
         </h1>
         <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
           Live operational metrics across users, transfers, accounts, and loans.
         </p>
       </div>
 
       {stats && (
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
           <AdminKpiCard
             title="Total Users"
             value={String(stats.total_users)}
             icon={<Users size={20} />}
           />
           <AdminKpiCard
             title="Active Users"
             value={String(stats.active_users)}
             icon={<Users size={20} />}
           />
           <AdminKpiCard
             title="Transfers"
             value={`${stats.total_transfers}`}
             subtitle={`Pending: ${stats.pending_transfers}`}
             icon={<ArrowLeftRight size={20} />}
           />
           <AdminKpiCard
             title="Deposits"
             value={`${stats.total_deposits}`}
             subtitle={`Pending: ${stats.pending_deposits}`}
             icon={<Landmark size={20} />}
           />
           <AdminKpiCard
             title="Loans"
             value={`${stats.total_loans}`}
             subtitle={`Pending: ${stats.pending_loans}`}
             icon={<ClipboardList size={20} />}
           />
           <AdminKpiCard
             title="Virtual Cards"
             value={`${stats.total_virtual_cards}`}
             subtitle={`Pending: ${stats.pending_cards}`}
           />
         </div>
       )}
     </div>
   )
 }
