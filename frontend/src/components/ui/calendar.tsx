'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type CalendarProps = {
  className?: string
  value?: Date
  onChange?: (date?: Date) => void
}

function Calendar({ className, value, onChange }: CalendarProps) {
  const [val, setVal] = React.useState<string>(
    value ? new Date(value).toISOString().slice(0, 10) : '',
  )
  return (
    <input
      data-slot="calendar"
      type="date"
      className={cn('rounded-md border p-2', className)}
      value={val}
      onChange={(e) => {
        setVal(e.target.value)
        onChange?.(e.target.value ? new Date(e.target.value) : undefined)
      }}
    />
  )
}

export { Calendar }
