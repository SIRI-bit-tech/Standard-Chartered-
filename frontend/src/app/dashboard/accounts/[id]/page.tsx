'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { colors } from '@/types'
import type { Account, Transaction, TransferHistoryItem } from '@/types'
import { AccountBalanceCard } from '@/components/accounts/AccountBalanceCard'
import { TransactionsTable } from '@/components/accounts/TransactionsTable'
import { API_BASE_URL, API_ENDPOINTS } from '@/constants'

export default function AccountDetailPage() {
  const params = useParams()
  const accountId = params.id as string
  const [account, setAccount] = useState<Account | null>(null)
  const [historyItems, setHistoryItems] = useState<TransferHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [txLimit, setTxLimit] = useState(50)
  const { user } = useAuthStore()

  useEffect(() => {
    loadAccountDetails()
  }, [accountId])

  const loadAccountDetails = async () => {
    try {
      const accountRes = await apiClient.get<{ success: boolean; data: Account }>(
        `${API_BASE_URL}${API_ENDPOINTS.ACCOUNTS}/${accountId}`,
      )
      if (accountRes.success) setAccount(accountRes.data)

      const histRes = await apiClient.get<{ success: boolean; data: { items: TransferHistoryItem[] } }>(
        `${API_BASE_URL}${API_ENDPOINTS.ACCOUNTS}/${accountId}/history?limit=${txLimit}`,
      )
      if (histRes.success) setHistoryItems(histRes.data.items)
    } catch (e) {
      console.error('Failed to load account details:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMoreTransactions = async () => {
    const nextLimit = txLimit + 50
    setLoadingMore(true)
    try {
      const histRes = await apiClient.get<{ success: boolean; data: { items: TransferHistoryItem[] } }>(
        `${API_BASE_URL}${API_ENDPOINTS.ACCOUNTS}/${accountId}/history?limit=${nextLimit}`,
      )
      if (histRes.success) setHistoryItems(histRes.data.items)
      setTxLimit(nextLimit)
    } catch (e) {
      console.error('Failed to load more transactions:', e)
    } finally {
      setLoadingMore(false)
    }
  }

  const accountHolderName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : '—'
  const isUS = user?.country === 'US'

  if (loading) {
    return (
      <div className="flex gap-6">
        <div className="w-64 shrink-0 rounded-xl border p-4" style={{ borderColor: colors.border }}>
          <div className="h-6 w-24 rounded bg-gray-200 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 rounded bg-gray-100" />
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-4">
          <div className="h-32 rounded-xl bg-gray-100" />
          <div className="h-96 rounded-xl bg-gray-100" />
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="py-12 text-center">
        <p style={{ color: colors.textSecondary }}>Account not found</p>
        <Link href="/dashboard/accounts" className="mt-2 inline-block text-sm font-medium" style={{ color: colors.primary }}>
          Back to Accounts
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        <Link href="/dashboard/accounts" className="inline-block text-sm font-medium" style={{ color: colors.primary }}>
          ← Back to Accounts
        </Link>

        <AccountBalanceCard
          availableBalance={account.available_balance}
          currency={account.currency}
          status={account.status}
        />

        <TransactionsTable
          historyItems={historyItems}
          onLoadMore={handleLoadMoreTransactions}
          canLoadMore={historyItems.length >= txLimit}
          loadingMore={loadingMore}
        />
      </div>
    </div>
  )
}
