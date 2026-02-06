'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface Statistics {
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

const StatCard = ({ label, value, pending = null }: { label: string; value: number; pending?: number | null }) => (
  <Card className="p-6 bg-white">
    <p className="text-sm text-muted-foreground mb-2">{label}</p>
    <p className="text-3xl font-bold text-foreground">{value}</p>
    {pending !== null && (
      <p className="text-xs text-warning mt-2">
        {pending} pending
      </p>
    )}
  </Card>
)

export default function AdminDashboard() {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const adminId = localStorage.getItem('admin_id')
        const response = await apiClient.get(`/admin/statistics?admin_id=${adminId}`)
        setStats(response.data.data)
      } catch (err: any) {
        logger.error('Failed to fetch statistics', { error: err })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6">Dashboard Overview</h2>
      </div>

      {/* Users */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Users</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total Users" value={stats?.total_users || 0} />
          <StatCard label="Active Users" value={stats?.active_users || 0} />
        </div>
      </div>

      {/* Transfers */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Transfers</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total Transfers" value={stats?.total_transfers || 0} pending={stats?.pending_transfers} />
        </div>
      </div>

      {/* Deposits */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Deposits</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total Deposits" value={stats?.total_deposits || 0} pending={stats?.pending_deposits} />
        </div>
      </div>

      {/* Loans */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Loans</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total Loans" value={stats?.total_loans || 0} pending={stats?.pending_loans} />
        </div>
      </div>

      {/* Virtual Cards */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Virtual Cards</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total Cards" value={stats?.total_virtual_cards || 0} pending={stats?.pending_cards} />
        </div>
      </div>
    </div>
  )
}
