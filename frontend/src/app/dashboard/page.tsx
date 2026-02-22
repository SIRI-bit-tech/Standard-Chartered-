'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useAccountStore } from '@/lib/store'
import { formatDate, getCurrencyFromCountry } from '@/lib/utils'
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

      // Fetch BTC price for total balance calculation
      let btcPrice = 0
      try {
        const priceRes: any = await apiClient.get('/api/v1/accounts/crypto-price?symbol=bitcoin')
        btcPrice = priceRes?.price || 65000
      } catch (e) {
        console.warn('Failed to fetch BTC price for summary, using fallback')
        btcPrice = 65000 // Fallback
      }

      const accountsResponse: AccountsResponse = await apiClient.get<AccountsResponse>(`/api/v1/accounts/`)
      if (accountsResponse.success) {
        setAccounts(accountsResponse.data)

        const total = accountsResponse.data.reduce((sum: number, acc: Account) => {
          if (acc.type === 'crypto' && acc.currency === 'BTC') {
            return sum + (acc.balance * btcPrice)
          }
          return sum + acc.balance
        }, 0)

        setTotalBalance(total)

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

  const country = (user.country || '').trim()
  const cUpper = country.toUpperCase()
  const isUS =
    cUpper === US_COUNTRY_CODE ||
    cUpper === 'USA' ||
    cUpper === 'UNITED STATES' ||
    cUpper === 'UNITED STATES OF AMERICA'
  const primaryAccount = accounts.find((a) => a.is_primary) ?? accounts[0]
  const primaryCurrency = user.primary_currency && user.primary_currency !== 'USD'
    ? user.primary_currency
    : (primaryAccount?.currency || getCurrencyFromCountry(user.country))

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: colors.textPrimary }}>
          Welcome back, {user.username}!
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm" style={{ color: colors.textSecondary }}>
          <Clock className="h-4 w-4" />
          {lastLoginText}
        </p>
        <AccountSummaryCard
          loading={loading}
          totalBalance={totalBalance}
          primaryCurrency={primaryCurrency}
          primaryAccount={primaryAccount}
          isUS={isUS}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: colors.textPrimary }}>
          My Accounts
        </h2>
        <AccountCards accounts={accounts} loading={loading} primaryCurrency={primaryCurrency} />
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
