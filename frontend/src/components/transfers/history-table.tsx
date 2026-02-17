import Link from 'next/link'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { colors, type TransferHistoryItem } from '@/types'

export function HistoryTable({
  items,
  page,
  total,
  pageSize,
  onPageChange,
}: {
  items: TransferHistoryItem[]
  page: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="rounded-xl border" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Beneficiary / Sender</th>
            <th className="px-4 py-3">Reference / Account</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const isReversed = it.status === 'reversed'
            const isDebit = it.direction === 'debit' && !isReversed
            const statusBg =
              it.status === 'completed'
                ? `${colors.success}20`
                : it.status === 'pending' || it.status === 'processing'
                ? '#FDF5E5'
                : it.status === 'reversed'
                ? `${colors.success}20`
                : '#FBEAEA'
            const statusFg =
              it.status === 'completed'
                ? colors.success
                : it.status === 'pending' || it.status === 'processing'
                ? colors.warning
                : it.status === 'reversed'
                ? colors.success
                : colors.error
            const subtitleText = it.bank_name ? `${it.bank_name} • ${it.subtitle ?? ''}`.trim() : it.subtitle || ''
            return (
              <tr key={it.id} className="border-t" style={{ borderColor: colors.border }}>
                <td className="px-4 py-3" style={{ color: colors.textPrimary }}>
                  {formatDateTime(it.date)}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium" style={{ color: colors.textPrimary }}>
                    {isReversed ? 'Transfer Reversed' : it.counterparty}
                  </div>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    {isReversed ? (it.subtitle || '') : subtitleText}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium" style={{ color: colors.textPrimary }}>
                    {it.transfer_id ? (
                      <Link href={`/dashboard/transfers/receipt/${it.transfer_id}`}>{it.reference}</Link>
                    ) : (
                      it.reference
                    )}
                  </div>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>{it.account_masked}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: statusBg, color: statusFg }}
                  >
                    {it.status.charAt(0).toUpperCase() + it.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold" style={{ color: isDebit ? colors.error : colors.success }}>
                  {isReversed ? '+' : isDebit ? '-' : '+'}
                  {formatCurrency(Math.abs(it.amount), it.currency)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs" style={{ color: colors.textSecondary }}>
          Showing {Math.min(total, (page - 1) * pageSize + items.length)} of {total} transactions
        </span>
        <div className="flex items-center gap-2">
          <button
            className="rounded border px-3 py-1 text-sm"
            style={{ borderColor: colors.border, color: colors.textPrimary }}
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            Previous
          </button>
          <span className="text-sm" style={{ color: colors.textSecondary }}>
            {page} / {totalPages}
          </span>
          <button
            className="rounded border px-3 py-1 text-sm"
            style={{ borderColor: colors.border, color: colors.textPrimary }}
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
