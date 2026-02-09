'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatCurrency } from '@/lib/utils'
import { colors } from '@/types'
import type { Account } from '@/types'

interface FromAccountSelectProps {
  accounts: Account[]
  value: string
  onChange: (accountId: string) => void
  label?: string
  showBalance?: boolean
  disabled?: boolean
  className?: string
}

/** Reusable "From Account" dropdown with optional balance display. */
export function FromAccountSelect({
  accounts,
  value,
  onChange,
  label = 'From Account',
  showBalance = true,
  disabled,
  className,
}: FromAccountSelectProps) {
  const selected = accounts.find((a) => a.id === value)
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
          {label}
        </Label>
        {showBalance && selected && (
          <span className="text-sm font-medium" style={{ color: colors.success }}>
            Balance: {formatCurrency(selected.available_balance ?? selected.balance, selected.currency)}
          </span>
        )}
      </div>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full" style={{ borderColor: colors.border }}>
          <SelectValue placeholder="Select account" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>
              {acc.nickname || acc.type} - ****{acc.account_number.slice(-4)} (
              {formatCurrency(acc.available_balance ?? acc.balance, acc.currency)})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

