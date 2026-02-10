'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { QUICK_ACTIONS } from '@/constants/dashboard'
import { cn } from '@/lib/utils'
import { colors } from '@/types'

export function QuickActionsGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon
        return (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              'flex flex-col items-center justify-center rounded-xl border p-6 transition-colors',
              'border-[color:var(--qa-border-color)]',
              'hover:border-primary hover:bg-primary/5',
            )}
            style={{ ['--qa-border-color' as any]: colors.border } as CSSProperties}
          >
            <div
              className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: colors.primaryLight, color: colors.primary }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-center text-sm font-medium" style={{ color: colors.textPrimary }}>
              {action.label}
            </span>
            {action.description && (
              <span className="mt-0.5 text-center text-xs" style={{ color: colors.textSecondary }}>
                {action.description}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
