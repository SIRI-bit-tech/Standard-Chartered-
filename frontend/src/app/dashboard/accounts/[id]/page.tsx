'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowRightLeft,
  FileText,
  ShoppingBag,
  Building2,
  CreditCard,
  Wallet,
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { colors } from '@/types'
import type { Account, Transaction } from '@/types'

const TRANSACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  payment: ShoppingBag,
  debit: ShoppingBag,
  credit: Building2,
  deposit: Building2,
  transfer: ArrowRightLeft,
  withdrawal: Wallet,
  fee: FileText,
  interest: Building2,
}

const format_account_status = (status: Account['status']) => {
  switch (status) {
    case 'active':
      return 'Active'
    case 'frozen':
      return 'Frozen'
    case 'closed':
      return 'Closed'
    case 'pending':
      return 'Pending'
    default:
      return 'Unknown'
  }
}

const OUTGOING_TRANSACTION_TYPES = new Set<Transaction['type']>([
  'debit',
  'withdrawal',
  'payment',
  'fee',
])

const get_account_status_color = (status: Account['status']) => {
  switch (status) {
    case 'active':
      return colors.success
    case 'pending':
      return colors.warning
    case 'frozen':
      return colors.error
    case 'closed':
      return colors.textSecondary
    default:
      return colors.textSecondary
  }
}

export default function AccountDetailPage() {
  const params = useParams()
  const accountId = params.id as string
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [txLimit, setTxLimit] = useState(50)
  const [typeFilter, setTypeFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('30')
  const { user } = useAuthStore()

  useEffect(() => {
    loadAccountDetails()
  }, [accountId])

  const loadAccountDetails = async () => {
    try {
      const accountRes = await apiClient.get<{ success: boolean; data: Account }>(
        `/api/v1/accounts/${accountId}`,
      )
      if (accountRes.success) setAccount(accountRes.data)

      const txRes = await apiClient.get<{ success: boolean; data: Transaction[] }>(
        `/api/v1/accounts/${accountId}/transactions?limit=${txLimit}`,
      )
      if (txRes.success) setTransactions(txRes.data)
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
      const txRes = await apiClient.get<{ success: boolean; data: Transaction[] }>(
        `/api/v1/accounts/${accountId}/transactions?limit=${nextLimit}`,
      )
      if (txRes.success) {
        setTransactions(txRes.data)
        setTxLimit(nextLimit)
      }
    } catch (e) {
      console.error('Failed to load more transactions:', e)
    } finally {
      setLoadingMore(false)
    }
  }

  const filteredTransactions = transactions.filter((t) => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    if (periodFilter === '30') {
      const d = new Date(t.created_at)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 30)
      return d >= cutoff
    }
    if (periodFilter === '90') {
      const d = new Date(t.created_at)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 90)
      return d >= cutoff
    }
    return true
  })

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
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left: Quick Actions + Account Details */}
      <aside
        className="w-full shrink-0 rounded-xl border p-6 lg:w-72"
        style={{ borderColor: colors.border, backgroundColor: colors.white }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.gray600 }}>
          Account Details
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt style={{ color: colors.textSecondary }}>Interest Rate</dt>
            <dd style={{ color: colors.textPrimary }}>{account.interest_rate ?? 0}% p.a.</dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: colors.textSecondary }}>Overdraft Limit</dt>
            <dd style={{ color: colors.textPrimary }}>
              {account.overdraft_limit != null ? formatCurrency(account.overdraft_limit, account.currency) : '—'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: colors.textSecondary }}>Account Holder</dt>
            <dd style={{ color: colors.textPrimary }}>{accountHolderName}</dd>
          </div>
          {isUS && (
            <div className="flex justify-between">
              <dt style={{ color: colors.textSecondary }}>Routing Number</dt>
              <dd className="font-mono" style={{ color: colors.textPrimary }}>
                {account.routing_number || '—'}
              </dd>
            </div>
          )}
        </dl>
      </aside>

      {/* Right: Available Balance + Transaction History */}
      <div className="min-w-0 flex-1 space-y-6">
        <Link href="/dashboard/accounts" className="inline-block text-sm font-medium" style={{ color: colors.primary }}>
          ← Back to Accounts
        </Link>

        <div
          className="rounded-xl border p-6"
          style={{ borderColor: colors.border, backgroundColor: colors.white }}
        >
          <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
            Available Balance
          </p>
          <p className="mt-1 text-3xl font-bold" style={{ color: colors.primary }}>
            {formatCurrency(account.available_balance, account.currency)}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
            <span
              className="inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: get_account_status_color(account.status) }}
            />
            {format_account_status(account.status)} Account • {account.currency}
          </p>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ borderColor: colors.border, backgroundColor: colors.white }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
              Transaction History
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border px-3 py-1.5 text-sm"
                style={{ borderColor: colors.border }}
              >
                <option value="all">All Types</option>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
                <option value="transfer">Transfer</option>
                <option value="payment">Payment</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="rounded-lg border px-3 py-1.5 text-sm"
                style={{ borderColor: colors.border }}
              >
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase" style={{ borderColor: colors.border, color: colors.textSecondary }}>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center" style={{ color: colors.textSecondary }}>
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const IconComponent = TRANSACTION_ICONS[tx.type] || CreditCard
                    // Check if transaction is outgoing (debit) or incoming (credit)
                    let isDebit = OUTGOING_TRANSACTION_TYPES.has(tx.type)
                    
                    // For transfers, determine direction from description patterns
                    if (tx.type === 'transfer') {
                      const description = tx.description.toLowerCase()
                      // Outgoing transfer patterns - use word boundaries for stricter matching
                      isDebit = /\bto\b/i.test(description) || 
                               /\bsent\b/i.test(description) || 
                               /\boutgoing\b/i.test(description) ||
                               /\bdebit\b/i.test(description) ||
                               (/\bfrom\b/i.test(description) && !/\breceived\b/i.test(description))
                    }
                    
                    const statusColor =
                      tx.status === 'completed'
                        ? colors.success
                        : tx.status === 'pending'
                          ? colors.warning
                          : colors.textSecondary
                    return (
                      <tr
                        key={tx.id}
                        className="border-b" style={{ borderColor: colors.border }}
                      >
                        <td className="py-3 pr-4" style={{ color: colors.textPrimary }}>
                          {formatDate(tx.created_at)}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span style={{ color: colors.textSecondary }}>
                              <IconComponent className="h-4 w-4 shrink-0" />
                            </span>
                            <div>
                              <p className="font-medium" style={{ color: colors.textPrimary }}>{tx.description}</p>
                              <p className="text-xs" style={{ color: colors.textSecondary }}>
                                {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} - ID: {tx.id.slice(-5)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                          >
                            {tx.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-right font-semibold" style={{ color: isDebit ? colors.error : colors.success }}>
                          {isDebit ? '-' : '+'}{formatCurrency(tx.amount, tx.currency)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {transactions.length >= txLimit && (
            <div className="mt-4 text-center">
              {filteredTransactions.length < transactions.length && (
                <p className="mb-2 text-xs" style={{ color: colors.textSecondary }}>
                  Some results are hidden by your filters
                </p>
              )}
              <button
                type="button"
                onClick={handleLoadMoreTransactions}
                disabled={loadingMore}
                className="text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: colors.primary }}
              >
                {loadingMore ? 'Loading…' : 'View More Transactions'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
