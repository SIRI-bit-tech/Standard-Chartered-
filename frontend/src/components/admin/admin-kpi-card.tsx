'use client'

import { colors } from '@/types'
import { cn } from '@/lib/utils'

interface AdminKpiCardProps {
  title: string
  value: string
  trend?: string
  icon?: React.ReactNode
  tone?: 'default' | 'warning'
  subtitle?: string
}

/** Small KPI card used on admin dashboard. */
export function AdminKpiCard({
  title,
  value,
  trend,
  icon,
  tone = 'default',
  subtitle,
}: AdminKpiCardProps) {
  const border =
    tone === 'warning' ? `2px solid ${colors.warning}` : `1px solid ${colors.border}`

  return (
    <div className="rounded-xl bg-white p-5" style={{ border }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: colors.primaryLight }}>
              {icon}
            </div>
          )}
          <div>
            <p className="text-xs" style={{ color: colors.textSecondary }}>
              {title}
            </p>
            <p className={cn('mt-1 text-2xl font-bold')} style={{ color: colors.textPrimary }}>
              {value}
            </p>
          </div>
        </div>
        {trend && (
          <span className="text-xs font-semibold" style={{ color: colors.success }}>
            {trend}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-2 text-xs" style={{ color: colors.textSecondary }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

