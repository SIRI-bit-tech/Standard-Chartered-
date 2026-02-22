import { colors, type TransferHistoryMetrics } from '@/types'
import { formatCurrency } from '@/lib/utils'

export function HistoryKpis({ metrics, currency = 'USD' }: { metrics: TransferHistoryMetrics; currency?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-xl border p-4" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
        <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>TOTAL SENT (MONTHLY)</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="text-2xl font-semibold" style={{ color: colors.error }}>
            -{formatCurrency(metrics.sent_monthly, currency)}
          </p>
          <span className="text-xs" style={{ color: colors.textSecondary }}>
            {metrics.sent_count} Transactions
          </span>
        </div>
      </div>
      <div className="rounded-xl border p-4" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
        <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>TOTAL RECEIVED (MONTHLY)</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="text-2xl font-semibold" style={{ color: colors.success }}>
            +{formatCurrency(metrics.received_monthly, currency)}
          </p>
          <span className="text-xs" style={{ color: colors.textSecondary }}>
            {metrics.received_count} Transactions
          </span>
        </div>
      </div>
      <div className="rounded-xl border p-4" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
        <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>PENDING AMOUNT</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="text-2xl font-semibold" style={{ color: colors.textPrimary }}>
            {formatCurrency(metrics.pending_amount, currency)}
          </p>
          <span className="text-xs" style={{ color: colors.textSecondary }}>
            {metrics.pending_count} Processing
          </span>
        </div>
      </div>
    </div>
  )
}
