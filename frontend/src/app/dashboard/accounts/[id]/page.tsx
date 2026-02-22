'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { CryptoWithdrawDialog } from '@/components/accounts/CryptoWithdrawDialog'
import { colors } from '@/types'
import type { Account, TransferHistoryItem } from '@/types'
import { AccountBalanceCard } from '@/components/accounts/AccountBalanceCard'
import { TransactionsTable } from '@/components/accounts/TransactionsTable'
import { API_BASE_URL, API_ENDPOINTS } from '@/constants'

export default function AccountDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const accountId = params.id as string
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<TransferHistoryItem[]>([])
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [txLimit, setTxLimit] = useState(50)

  useEffect(() => {
    loadAccountDetails()
  }, [accountId, searchParams])

  const loadAccountDetails = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: Account }>(
        `${API_BASE_URL}${API_ENDPOINTS.ACCOUNTS}/${accountId}`,
      )
      if (res.success) {
        setAccount(res.data)
        // Check if withdraw action requested
        if (searchParams.get('action') === 'withdraw' && res.data.type === 'crypto') {
          setWithdrawOpen(true)
        }
      }

      const histRes = await apiClient.get<{ success: boolean; data: { items: TransferHistoryItem[] } }>(
        `${API_BASE_URL}${API_ENDPOINTS.ACCOUNTS}/${accountId}/history?limit=${txLimit}`,
      )
      if (histRes.success) setTransactions(histRes.data.items)
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
      if (histRes.success) setTransactions(histRes.data.items)
      setTxLimit(nextLimit)
    } catch (e) {
      console.error('Failed to load more transactions:', e)
    } finally {
      setLoadingMore(false)
    }
  }

  if (loading) {
    return (
      <div className="flex gap-6 py-6">
        <div className="flex-1 space-y-4">
          <div className="h-32 rounded-xl bg-gray-100 animate-pulse" />
          <div className="h-96 rounded-xl bg-gray-100 animate-pulse" />
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
    <div className="flex flex-col gap-6 py-4">
      <div className="min-w-0 flex-1 space-y-6">
        <Link href="/dashboard/accounts" className="inline-block text-sm font-medium hover:underline transition-all" style={{ color: colors.primary }}>
          ← Back to Accounts
        </Link>

        <AccountBalanceCard
          availableBalance={account.available_balance}
          currency={account.currency}
          status={account.status}
          type={account.type}
          wallet_id={account.wallet_id}
          wallet_qrcode={account.wallet_qrcode}
          onWithdraw={() => setWithdrawOpen(true)}
        />

        <div className="space-y-4">
          <h2 className="text-xl font-bold px-1" style={{ color: colors.textPrimary }}>Transaction History</h2>
          <TransactionsTable
            historyItems={transactions}
            onLoadMore={handleLoadMoreTransactions}
            canLoadMore={transactions.length >= txLimit}
            loadingMore={loadingMore}
          />
        </div>
      </div>

      {account && account.type === 'crypto' && (
        <CryptoWithdrawDialog
          open={withdrawOpen}
          onOpenChange={setWithdrawOpen}
          account={account}
        />
      )}
    </div>
  )
}
