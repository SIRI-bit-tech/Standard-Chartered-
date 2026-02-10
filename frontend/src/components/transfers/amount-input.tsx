'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { colors } from '@/types'

interface AmountInputProps {
  value: number
  onChange: (value: number) => void
  currency?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

/** Reusable amount input with currency prefix/suffix. Real-time value for summary. */
export function AmountInput({
  value,
  onChange,
  currency = 'USD',
  label = 'Amount',
  placeholder = '0.00',
  disabled,
  className,
}: AmountInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    const num = parseFloat(raw) || 0
    onChange(num)
  }

  const displayValue = value === 0 ? '' : (value % 1 === 0 ? value.toString() : value.toFixed(2))

  return (
    <div className={className}>
      <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
        {label}
      </Label>
      <div
        className="mt-1.5 flex items-center rounded-lg border bg-white"
        style={{ borderColor: colors.border }}
      >
        <span className="pl-3 text-muted-foreground">$</span>
        <Input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          disabled={disabled}
          className="border-0 bg-transparent focus-visible:ring-0"
        />
        <span
          className="pr-3 text-sm font-medium"
          style={{ color: colors.textSecondary }}
        >
          {currency}
        </span>
      </div>
    </div>
  )
}
