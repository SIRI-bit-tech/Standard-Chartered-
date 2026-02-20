'use client'

import { useMemo, useState } from 'react'
import { colors, type TransferHistoryItem } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction } from '@/types'
import { ArrowDownLeft, ArrowUpRight, RotateCcw, ArrowRightLeft, FileText, ShoppingCart, TrendingDown, TrendingUp, PiggyBank, Banknote, Landmark } from 'lucide-react'

const ICONS: Record<string, any> = {
  payment: ShoppingCart,
  debit: TrendingDown,
  credit: TrendingUp,
  deposit: PiggyBank,
  transfer: ArrowRightLeft,
  withdrawal: Banknote,
  fee: FileText,
  interest: Landmark,
}

const OUTGOING = new Set<Transaction['type']>(['debit', 'withdrawal', 'payment', 'fee'])

export interface TransactionsTableProps {
  items?: Transaction[]
  historyItems?: TransferHistoryItem[]
  onLoadMore?: () => void
  canLoadMore?: boolean
  loadingMore?: boolean
}

export function TransactionsTable({ items = [], historyItems = [], onLoadMore, canLoadMore, loadingMore }: TransactionsTableProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | Transaction['type'] | 'debit' | 'credit'>('all')
  const [periodFilter, setPeriodFilter] = useState<'30' | '90' | 'all'>('30')
  const isUsingHistory = historyItems.length > 0

  const filteredHistory = useMemo(() => {
    if (!isUsingHistory) return []
    return historyItems.filter((h) => {
      if (typeFilter !== 'all' && h.direction !== typeFilter) return false
      const d = new Date(h.date)
      if (periodFilter === '30') {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 30)
        return d >= cutoff
      }
      if (periodFilter === '90') {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 90)
        return d >= cutoff
      }
      return true
    })
  }, [historyItems, typeFilter, periodFilter, isUsingHistory])

  const filtered = useMemo(() => {
    if (isUsingHistory) return []
    return items.filter((t) => {
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
  }, [items, typeFilter, periodFilter, isUsingHistory])

  return (
    <div className="rounded-xl border p-6" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
          Transaction History
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {isUsingHistory ? (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: colors.border }}
            >
              <option value="all">All Types</option>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          ) : (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
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
          )}
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as any)}
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
            <tr
              className="border-b text-left text-xs font-medium uppercase"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
            >
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Description</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(isUsingHistory ? filteredHistory : filtered).length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center" style={{ color: colors.textSecondary }}>
                  No transactions found
                </td>
              </tr>
            ) : isUsingHistory ? (
              filteredHistory.map((it) => {
                const isReversed = it.status === 'reversed'
                const debit = it.direction === 'debit' && !isReversed
                const bg = isReversed ? `${colors.success}20` : debit ? `${colors.error}20` : `${colors.success}20`
                const fg = isReversed ? colors.success : debit ? colors.error : colors.success
                return (
                  <tr key={it.id} className="border-b" style={{ borderColor: colors.border }}>
                    <td className="py-3 pr-4" style={{ color: colors.textPrimary }}>
                      {formatDate(it.date)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: bg }}>
                          {isReversed ? (
                            <RotateCcw className="h-4 w-4" style={{ color: fg }} />
                          ) : debit ? (
                            <ArrowDownLeft className="h-4 w-4" style={{ color: fg }} />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" style={{ color: fg }} />
                          )}
                        </span>
                        <div>
                          <p className="font-medium" style={{ color: colors.textPrimary }}>
                            {it.counterparty}
                          </p>
                          <p className="text-xs" style={{ color: colors.textSecondary }}>
                            {it.subtitle}
                            {it.reference ? ` • Ref: ${it.reference}` : null}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${fg}20`, color: fg }}>
                        {it.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold" style={{ color: fg }}>
                      {isReversed ? '+' : debit ? '-' : '+'}
                      {formatCurrency(Math.abs(it.amount), it.currency)}
                    </td>
                  </tr>
                )
              })
            ) : (
              filtered.map((tx) => {
                const Icon = ICONS[tx.type] || TrendingUp
                let isDebit = OUTGOING.has(tx.type)
                if (tx.type === 'transfer') {
                  const description = tx.description.toLowerCase()
                  isDebit =
                    /\bto\b/i.test(description) ||
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
                  <tr key={tx.id} className="border-b" style={{ borderColor: colors.border }}>
                    <td className="py-3 pr-4" style={{ color: colors.textPrimary }}>
                      {formatDate(tx.created_at)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span style={{ color: colors.textSecondary }}>
                          <Icon className="h-4 w-4 shrink-0" />
                        </span>
                        <div>
                          <p className="font-medium" style={{ color: colors.textPrimary }}>
                            {tx.description}
                          </p>
                          <p className="text-xs" style={{ color: colors.textSecondary }}>
                            {(tx.description?.toLowerCase().includes('transfer') ? 'Transfer' : tx.type.charAt(0).toUpperCase() + tx.type.slice(1))} - ID: {tx.id.slice(-5)}
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
                      {isDebit ? '-' : '+'}
                      {formatCurrency(tx.amount, tx.currency)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {canLoadMore && (
        <div className="mt-4 text-center">
          {!isUsingHistory && filtered.length < items.length && (
            <p className="mb-2 text-xs" style={{ color: colors.textSecondary }}>
              Some results are hidden by your filters
            </p>
          )}
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: colors.primary }}
          >
            {loadingMore ? 'Loading…' : 'View More Transactions'}
          </button>
        </div>
      )}
    </div>
  )
}
