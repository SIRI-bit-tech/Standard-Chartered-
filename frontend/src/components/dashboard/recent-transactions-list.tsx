'use client'

import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { colors } from '@/types'
import type { Transaction } from '@/types'

export function RecentTransactionsList({
  transactions,
  loading,
}: {
  transactions: Transaction[]
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg"
            style={{ backgroundColor: colors.gray100 }}
          />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: colors.textSecondary }}>
        No transactions yet
      </p>
    )
  }

  const isDebit = (t: Transaction) => t.type === 'debit' || t.type === 'withdrawal'

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
        <span className="flex-1">Transaction</span>
        <span className="w-24">Date</span>
        <span className="w-28 text-right">Amount</span>
      </div>
      {transactions.map((t) => (
        <Link
          key={t.id}
          href="/dashboard/accounts"
          className="flex items-center gap-2 rounded-lg border px-3 py-3 transition-colors hover:bg-muted/50"
          style={{ borderColor: colors.border }}
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: colors.textPrimary }}>
            {t.description}
          </span>
          <span className="w-24 shrink-0 text-sm" style={{ color: colors.textSecondary }}>
            {formatDate(t.created_at)}
          </span>
          <span
            className="w-28 shrink-0 text-right text-sm font-semibold"
            style={{ color: isDebit(t) ? colors.error : colors.success }}
          >
            {isDebit(t) ? '-' : '+'}{formatCurrency(t.amount, t.currency)}
          </span>
        </Link>
      ))}
      <div className="pt-2 text-right">
        <Link
          href="/dashboard/accounts"
          className="text-sm font-medium"
          style={{ color: colors.primary }}
        >
          View all
        </Link>
      </div>
    </div>
  )
}
