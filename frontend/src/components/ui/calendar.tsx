'use client'

import { cn } from '@/lib/utils'

type CalendarProps = {
  className?: string
  value?: Date
  onChange?: (date?: Date) => void
}

function Calendar({ className, value, onChange }: CalendarProps) {
  const toYMDLocal = (d?: Date) => {
    if (!d) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const val = toYMDLocal(value)
  return (
    <input
      data-slot="calendar"
      type="date"
      className={cn('rounded-md border p-2', className)}
      value={val}
      onChange={(e) => {
        const v = e.target.value
        if (!v) {
          onChange?.(undefined)
          return
        }
        const parts = v.split('-')
        if (parts.length !== 3) {
          onChange?.(undefined)
          return
        }
        const y = Number.parseInt(parts[0], 10)
        const m = Number.parseInt(parts[1], 10)
        const d = Number.parseInt(parts[2], 10)
        if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
          onChange?.(undefined)
          return
        }
        if (m < 1 || m > 12) {
          onChange?.(undefined)
          return
        }
        const maxD = new Date(y, m, 0).getDate()
        if (d < 1 || d > maxD) {
          onChange?.(undefined)
          return
        }
        onChange?.(new Date(y, m - 1, d))
      }}
    />
  )
}

export { Calendar }
