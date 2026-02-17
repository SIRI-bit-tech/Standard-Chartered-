'use client'

import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, RotateCcw } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { colors } from '@/types'
import type { TransferHistoryItem } from '@/types'

export function RecentTransactionsList({
  items,
  loading,
}: {
  items: TransferHistoryItem[]
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

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: colors.textSecondary }}>
        No transactions yet
      </p>
    )
  }

  const isDebit = (it: TransferHistoryItem) =>
    it.status === 'reversed' ? false : it.direction === 'debit'

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
        <span className="flex-1">Transaction</span>
        <span className="w-48">Reference</span>
        <span className="w-40">Date</span>
        <span className="w-28 text-right">Amount</span>
      </div>
      {items.map((it) => {
        const href = it.transfer_id ? `/dashboard/transfers/receipt/${it.transfer_id}` : '/dashboard/accounts'
        const amountAbs = Math.abs(it.amount)
        const DebitIcon = ArrowDownLeft
        const CreditIcon = ArrowUpRight
        const ReverseIcon = RotateCcw
        const debit = isDebit(it)
        return (
          <Link
            key={it.id}
            href={href}
            className="flex items-center gap-2 rounded-lg border px-3 py-3 transition-colors hover:bg-muted/50"
            style={{ borderColor: colors.border }}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: it.status === 'reversed' ? `${colors.success}20` : (debit ? `${colors.error}20` : `${colors.success}20`) }}
            >
              {it.status === 'reversed' ? (
                <ReverseIcon className="h-4 w-4" style={{ color: colors.success }} />
              ) : debit ? (
                <DebitIcon className="h-4 w-4" style={{ color: colors.error }} />
              ) : (
                <CreditIcon className="h-4 w-4" style={{ color: colors.success }} />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm" style={{ color: colors.textPrimary }}>
              <span className="block font-semibold truncate">
                {it.status === 'reversed' ? 'Transfer Reversed' : it.counterparty}
              </span>
              {it.subtitle ? (
                <span className="block text-xs truncate" style={{ color: colors.textSecondary }}>
                  {it.subtitle}
                </span>
              ) : null}
            </span>
            <span className="w-48 truncate text-sm font-medium" style={{ color: colors.textPrimary }}>
              {it.reference}
            </span>
            <span className="w-40 shrink-0 text-sm" style={{ color: colors.textSecondary }}>
              {formatDateTime(it.date)}
            </span>
            <span
              className="w-28 shrink-0 text-right text-sm font-semibold"
              style={{ color: it.status === 'reversed' ? colors.success : (debit ? colors.error : colors.success) }}
            >
              {it.status === 'reversed' ? '+' : (debit ? '-' : '+')}
              {formatCurrency(amountAbs, it.currency)}
            </span>
          </Link>
        )
      })}
      
    </div>
  )
}
