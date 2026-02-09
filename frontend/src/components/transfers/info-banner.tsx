'use client'

import { Info, Shield, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { colors } from '@/types'

type Variant = 'info' | 'success' | 'warning'

interface InfoBannerProps {
  message: string
  variant?: Variant
  icon?: 'info' | 'shield' | 'zap'
  className?: string
}

const variantStyles: Record<Variant, { bg: string; border: string; text: string }> = {
  info: { bg: colors.primaryLight, border: colors.primary, text: colors.textPrimary },
  success: { bg: '#E8F5E9', border: colors.success, text: colors.textPrimary },
  warning: { bg: '#FFF8E1', border: colors.warning, text: colors.textPrimary },
}

/** Reusable info/alert banner for transfer page (e.g. "Standard ACH typically takes 1-3 days"). */
export function InfoBanner({
  message,
  variant = 'info',
  icon = 'info',
  className,
}: InfoBannerProps) {
  const style = variantStyles[variant]
  const Icon = icon === 'shield' ? Shield : icon === 'zap' ? Zap : Info
  return (
    <div
      className={cn('flex items-start gap-3 rounded-lg border p-3 text-sm', className)}
      style={{ backgroundColor: style.bg, borderColor: style.border, color: style.text }}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
