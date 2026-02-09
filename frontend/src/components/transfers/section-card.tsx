'use client'

import { cn } from '@/lib/utils'
import { colors } from '@/types'

interface SectionCardProps {
  number: number
  title: string
  children: React.ReactNode
  className?: string
}

/** Numbered section card for transfer form (e.g. "1 Sender Information"). */
export function SectionCard({ number, title, children, className }: SectionCardProps) {
  return (
    <div
      className={cn('rounded-xl border p-5', className)}
      style={{ borderColor: colors.border, backgroundColor: colors.white }}
    >
      <div className="mb-4 flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: colors.primary }}
        >
          {number}
        </span>
        <h3 className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}
