'use client'

import { cn } from '@/lib/utils'
import { colors } from '@/types'
import type { TransferTypeTab } from '@/types'

const TABS: { value: TransferTypeTab; label: string }[] = [
  { value: 'internal', label: 'Internal' },
  { value: 'domestic', label: 'Domestic' },
  { value: 'international', label: 'International' },
  { value: 'ach', label: 'ACH' },
]

interface TransferTypeTabsProps {
  value: TransferTypeTab
  onChange: (value: TransferTypeTab) => void
  className?: string
}

/** Reusable tab row for transfer type: Internal, Domestic, International, ACH. Single design. */
export function TransferTypeTabs({ value, onChange, className }: TransferTypeTabsProps) {
  return (
    <div
      className={cn('flex flex-wrap gap-2 rounded-lg border p-1', className)}
      style={{ borderColor: colors.border }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors',
          )}
          style={{
            backgroundColor: value === tab.value ? colors.primary : 'transparent',
            color: value === tab.value ? colors.textLight : colors.textPrimary,
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
