import { Shield } from 'lucide-react'
import { colors } from '@/types'

export function SecurityTipCard() {
  return (
    <div className="rounded-xl border p-4 md:p-6" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${colors.primary}10` }}>
          <Shield className="h-5 w-5" style={{ color: colors.primary }} />
        </span>
        <div>
          <div className="font-semibold mb-0.5" style={{ color: colors.textPrimary }}>Security Tip</div>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Always verify your payee before sending money. Never share your 4-digit transfer PIN.
          </p>
        </div>
      </div>
    </div>
  )
}
