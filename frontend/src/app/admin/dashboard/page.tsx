'use client'

import { useEffect,useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { Loader2 } from 'lucide-react'
import { AdminKpiCard } from '@/components/admin/admin-kpi-card'
import { AdminLineChart } from '@/components/admin/admin-line-chart'
import { AdminActivityFeed, AdminSystemAlerts } from '@/components/admin/admin-dashboard-panels'
import { colors } from '@/types'
import type { AdminDashboardOverviewResponse } from '@/types'
import { Users, CreditCard, ArrowLeftRight, ClipboardCheck } from 'lucide-react'
import { useAdminRealtime } from '@/hooks/use-admin-realtime'

export default function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchOverview() {
    try {
      const adminId = localStorage.getItem('admin_id')
      if (!adminId) {
        window.location.href = '/admin/auth/login'
        return
      }
      const response = await apiClient.get<{ success: boolean; data: AdminDashboardOverviewResponse }>(
        `/admin/dashboard/overview?admin_id=${adminId}`,
      )
      if (response.success) setData(response.data)
    } catch (err: any) {
      logger.error('Failed to fetch admin overview', { error: err })
      if (err.response?.status === 403) {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_refresh_token')
        localStorage.removeItem('admin_id')
        window.location.href = '/admin/auth/login'
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [])
  useAdminRealtime('admin:dashboard', () => {
    fetchOverview()
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="ml-4">Loading dashboard...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-10 text-center text-sm" style={{ color: colors.textSecondary }}>
        No dashboard data available.
      </div>
    )
  }

  const k = data.kpis

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          title="Total Users"
          value={k.total_users.toLocaleString()}
          icon={<Users className="h-5 w-5" style={{ color: colors.primary }} />}
        />
        <AdminKpiCard
          title="Total Accounts"
          value={k.total_accounts.toLocaleString()}
          icon={<CreditCard className="h-5 w-5" style={{ color: colors.primary }} />}
        />
        <AdminKpiCard
          title="Monthly Transactions"
          value={k.monthly_transactions.toLocaleString()}
          icon={<ArrowLeftRight className="h-5 w-5" style={{ color: colors.primary }} />}
        />
        <AdminKpiCard
          title="Pending Verifications"
          value={k.pending_verifications.toLocaleString()}
          tone="warning"
          icon={<ClipboardCheck className="h-5 w-5" style={{ color: colors.warning }} />}
          subtitle="Users without completed KYC"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 lg:col-span-2" style={{ borderColor: colors.border }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                Transaction Volume
              </h3>
              <p className="mt-0.5 text-xs" style={{ color: colors.textSecondary }}>
                Global settlement activity across all regions
              </p>
            </div>
            <div className="flex gap-2">
              <button className="rounded-md bg-muted px-3 py-1 text-xs font-medium">24h</button>
              <button className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground">7d</button>
              <button className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground">30d</button>
            </div>
          </div>
          <div className="mt-4">
            <AdminLineChart data={data.transaction_volume} />
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5" style={{ borderColor: colors.border }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                User Growth
              </h3>
              <p className="mt-0.5 text-xs" style={{ color: colors.textSecondary }}>
                New monthly registrations
              </p>
            </div>
            <button className="text-muted-foreground">⋮</button>
          </div>
          <div className="mt-4">
            <AdminLineChart data={data.user_growth} height={180} />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase" style={{ color: colors.textSecondary }}>
                Total Users
              </p>
              <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                {k.total_users.toLocaleString()}
              </p>
            </div>
            <span
              className="rounded-md px-2 py-1 text-[11px] font-semibold"
              style={{ backgroundColor: `${colors.primary}10`, color: colors.primary }}
            >
              Live
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminActivityFeed items={data.activity_feed} />
        <AdminSystemAlerts items={data.system_alerts} />
      </div>
    </div>
  )
}
