'use client'

import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { colors } from '@/types'
import type { TransferSummaryState } from '@/types'

interface TransferSummaryCardProps {
  summary: TransferSummaryState
  onConfirm: () => void
  confirmLabel?: string
  disclaimer?: string
  secureMessage?: string
  loading?: boolean
  className?: string
}

/** Right-side summary card with real-time amount, fee, total and confirm button. */
export function TransferSummaryCard({
  summary,
  onConfirm,
  confirmLabel = 'Review Transfer',
  disclaimer,
  secureMessage,
  loading,
  className,
}: TransferSummaryCardProps) {
  return (
    <div
      className={cn('rounded-xl border p-6', className)}
      style={{ borderColor: colors.border, backgroundColor: colors.white }}
    >
      <h3 className="text-base font-semibold" style={{ color: colors.textPrimary }}>
        Transfer Summary
      </h3>
      <p className="mt-0.5 text-xs" style={{ color: colors.textSecondary }}>
        Real-time estimate
      </p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt style={{ color: colors.textSecondary }}>Amount</dt>
          <dd style={{ color: colors.textPrimary }}>
            {formatCurrency(summary.amount, summary.currency)}
          </dd>
        </div>
        {summary.exchangeRate != null && (
          <div className="flex justify-between">
            <dt style={{ color: colors.textSecondary }}>Exchange Rate</dt>
            <dd style={{ color: colors.textPrimary }}>{summary.exchangeRate}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt style={{ color: colors.textSecondary }}>Transfer Fee</dt>
          <dd style={{ color: colors.textPrimary }}>
            {formatCurrency(summary.fee, summary.currency)}
          </dd>
        </div>
        {summary.recipientReceives != null && (
          <div className="flex justify-between">
            <dt style={{ color: colors.textSecondary }}>Recipient Receives</dt>
            <dd style={{ color: colors.success }}>
              {formatCurrency(summary.recipientReceives, summary.currency)}
            </dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt style={{ color: colors.textSecondary }}>Estimated Delivery</dt>
          <dd style={{ color: colors.textPrimary }}>{summary.estimatedDelivery}</dd>
        </div>
      </dl>
      <div className="mt-4 border-t pt-4" style={{ borderColor: colors.border }}>
        <div className="flex justify-between text-base font-bold">
          <span style={{ color: colors.textPrimary }}>Total to Pay</span>
          <span style={{ color: colors.primary }}>
            {formatCurrency(summary.totalToPay, summary.currency)}
          </span>
        </div>
      </div>
      <Button
        className="mt-4 w-full"
        onClick={onConfirm}
        disabled={loading || summary.amount <= 0}
      >
        {loading ? 'Processing...' : confirmLabel}
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
      {disclaimer != null && (
        <p className="mt-3 text-xs" style={{ color: colors.textSecondary }}>
          {disclaimer}
        </p>
      )}
      {secureMessage != null && (
        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: colors.textSecondary }}>
          {secureMessage}
        </div>
      )}
    </div>
  )
}
