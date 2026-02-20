'use client'

import { colors } from '@/types'
import { formatCurrency } from '@/lib/utils'
import type { Account } from '@/types'

function getStatusLabel(status: Account['status']) {
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

function getStatusColor(status: Account['status']) {
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

export interface AccountBalanceCardProps {
  availableBalance: number
  currency: string
  status: Account['status']
}

export function AccountBalanceCard({ availableBalance, currency, status }: AccountBalanceCardProps) {
  return (
    <div className="rounded-xl border p-6" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
      <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
        Available Balance
      </p>
      <p className="mt-1 text-3xl font-bold" style={{ color: colors.primary }}>
        {formatCurrency(availableBalance, currency)}
      </p>
      <p className="mt-2 flex items-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
        <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: getStatusColor(status) }} />
        {getStatusLabel(status)} Account • {currency}
      </p>
    </div>
  )
}

