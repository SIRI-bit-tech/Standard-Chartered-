'use client'

import { useEffect, useState, useRef } from 'react'
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

function getCurrencySymbol(currencyCode: string) {
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0)

    return parts.find((p) => p.type === 'currency')?.value ?? ''
  } catch {
    return ''
  }
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
  const [rawValue, setRawValue] = useState('')
  const currencySymbol = getCurrencySymbol(currency)
  const prevValueRef = useRef(value)

  useEffect(() => {
    // Only run when external value changes, not on user typing
    if (value !== prevValueRef.current) {
      // External value changed, clear user input
      setRawValue('')
      prevValueRef.current = value
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9.]/g, '')
    
    // Keep only the first decimal point
    const firstDotIndex = raw.indexOf('.')
    if (firstDotIndex !== -1) {
      // Remove all dots after the first one
      const beforeDot = raw.substring(0, firstDotIndex + 1)
      const afterDot = raw.substring(firstDotIndex + 1).replace(/\./g, '')
      raw = beforeDot + afterDot
    }
    
    // Normalize leading dot to '0.'
    if (raw.startsWith('.')) {
      raw = '0.' + raw.substring(1)
    }
    
    setRawValue(raw)
    onChange(parseFloat(raw) || 0)
  }

  const formattedValue = value === 0 ? '' : (value % 1 === 0 ? value.toString() : value.toFixed(2))
  const displayValue = rawValue !== '' ? rawValue : formattedValue

  return (
    <div className={className}>
      <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
        {label}
      </Label>
      <div
        className="mt-1.5 flex items-center rounded-lg border bg-white"
        style={{ borderColor: colors.border }}
      >
        <span className="pl-3 text-muted-foreground">{currencySymbol}</span>
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
