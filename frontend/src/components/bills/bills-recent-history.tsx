import { colors } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface BillHistoryItem {
  id: string
  payee_name?: string | null
  payee_category?: string | null
  amount: number
  currency?: string
  status: string
  created_at: string
  reference?: string
}

export function BillsRecentHistory({ items }: { items: BillHistoryItem[] }) {
  if (!items?.length) {
    return (
      <div className="rounded-xl border p-6 text-center" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
        <p className="text-sm" style={{ color: colors.textSecondary }}>No recent bill payments</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
      <div className="border-b p-4" style={{ borderColor: colors.border }}>
        <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>Recent History</h3>
      </div>
      <div className="divide-y" style={{ borderColor: colors.border }}>
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium" style={{ color: colors.textPrimary }}>
                {it.payee_name || 'Bill Payment'} {it.payee_category ? <span className="text-xs" style={{ color: colors.textSecondary }}>• {String(it.payee_category).toUpperCase()}</span> : null}
              </div>
              <div className="text-xs" style={{ color: colors.textSecondary }}>
                {formatDate(it.created_at)} • Ref: {it.reference || '—'}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold" style={{ color: colors.error }}>
                -{formatCurrency(it.amount, it.currency || 'USD')}
              </div>
              <div className="text-xs font-medium" style={{ color: it.status === 'paid' || it.status === 'completed' ? colors.success : it.status === 'pending' ? colors.warning : colors.error }}>
                {it.status.toUpperCase()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
