'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useAccountStore } from '@/lib/store'
import { formatDate } from '@/lib/utils'
import { AccountCards } from '@/components/dashboard/account-cards'
import { AccountSummaryCard } from '@/components/dashboard/account-summary-card'
import { QuickActionsGrid } from '@/components/dashboard/quick-actions-grid'
import { RecentTransactionsList } from '@/components/dashboard/recent-transactions-list'
import { colors } from '@/types'
import type { Account, TransferHistoryItem } from '@/types'

const US_COUNTRY_CODE = 'US'

type AccountsResponse = { success: boolean; message?: string; data: Account[] }
type TransferHistoryResponse = {
  success: boolean
  data: { items: TransferHistoryItem[]; total: number; page: number; page_size: number }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [totalBalance, setTotalBalance] = useState(0)
  const [recentItems, setRecentItems] = useState<TransferHistoryItem[]>([])
  const { user } = useAuthStore()
  const { accounts, setAccounts } = useAccountStore()
  const router = useRouter()

  useEffect(() => {
    if (!user) router.push('/auth/login')
  }, [user])

  useEffect(() => {
    if (user) loadDashboardData()
  }, [user])

  if (!user) return null

  async function loadDashboardData() {
    try {
      if (!user) return
      const accountsResponse: AccountsResponse = await apiClient.get<AccountsResponse>(`/api/v1/accounts/`)
      if (accountsResponse.success) {
        setAccounts(accountsResponse.data)
        setTotalBalance(
          accountsResponse.data.reduce((sum: number, acc: Account) => sum + acc.balance, 0),
        )
        // Load unified recent transfer history for consistent display
        const hx: TransferHistoryResponse = await apiClient.get<TransferHistoryResponse>(
          `/api/v1/transfers/history?page=1&page_size=5`,
        )
        if (hx.success) setRecentItems(hx.data.items)
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e)
    } finally {
      setLoading(false)
    }
  }

  const lastLoginText = user.last_login
    ? `Last login: ${formatDate(user.last_login)}`
    : 'Welcome'

  const isUS = user.country === US_COUNTRY_CODE
  const primaryAccount = accounts.find((a) => a.is_primary) ?? accounts[0]

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
          Welcome back, {user.username}!
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm" style={{ color: colors.textSecondary }}>
          <Clock className="h-4 w-4" />
          {lastLoginText}
        </p>
        <AccountSummaryCard
          loading={loading}
          totalBalance={totalBalance}
          primaryCurrency={user.primary_currency}
          primaryAccount={primaryAccount}
          isUS={isUS}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: colors.textPrimary }}>
          My Accounts
        </h2>
        <AccountCards accounts={accounts} loading={loading} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: colors.textPrimary }}>
          Quick Actions
        </h2>
        <QuickActionsGrid />
      </section>

      <section className="rounded-xl border bg-card p-6" style={{ borderColor: colors.border }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
            Recent Transactions
          </h2>
          <Link href="/dashboard/accounts" className="text-sm font-medium" style={{ color: colors.primary }}>
            View all
          </Link>
        </div>
        <RecentTransactionsList items={recentItems} loading={loading} />
      </section>
    </div>
  )
}
