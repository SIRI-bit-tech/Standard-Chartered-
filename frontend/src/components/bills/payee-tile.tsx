import { useState } from 'react'
import { colors } from '@/types'
import { Zap, Droplets, Wifi, Smartphone, Building2, CreditCard, ShieldCheck, Receipt, Trash2 } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

export interface Payee {
  id: string
  name: string
  account_number?: string
  category?: string | null
}

const ICONS: Record<string, any> = {
  utility: Zap,
  utilities: Zap,
  electricity: Zap,
  water: Droplets,
  internet: Wifi,
  telecom: Smartphone,
  phone: Smartphone,
  rent: Building2,
  mortgage: Building2,
  insurance: ShieldCheck,
  subscription: Receipt,
  cable: Wifi,
  credit_card: CreditCard,
  other: Receipt,
}

function mask(num?: string) {
  if (!num) return ''
  const last4 = num.slice(-4)
  return `****${last4}`
}

export function PayeeTile({ payee, onDeleted }: { payee: Payee; onDeleted: (id: string) => void }) {
  const key = (payee.category || '').toLowerCase().trim()
  const Icon = ICONS[key] || Receipt
  const [confirmOpen, setConfirmOpen] = useState(false)
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${colors.primary}10` }}>
            <Icon className="h-5 w-5" style={{ color: colors.primary }} />
          </span>
          <div>
            <div className="font-medium" style={{ color: colors.textPrimary }}>{payee.name}</div>
            <div className="text-xs" style={{ color: colors.textSecondary }}>
              {(payee.category || 'Bill').toString().toUpperCase()} {payee.account_number ? `• ${mask(payee.account_number)}` : null}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="rounded-md p-2"
          title="Delete payee"
          style={{ color: colors.textSecondary, border: `1px solid ${colors.border}` }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {confirmOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0" style={{ backgroundColor: '#00000040' }} onClick={() => setConfirmOpen(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border bg-white p-4 shadow-lg" style={{ borderColor: colors.border }}>
            <div className="mb-2 font-semibold" style={{ color: colors.textPrimary }}>Delete Payee</div>
            <div className="mb-4 text-sm" style={{ color: colors.textSecondary }}>
              Are you sure you want to delete “{payee.name}”? This removes it from your payees list.
            </div>
            <div className="flex justify-end gap-2">
              <button className="rounded-md px-3 py-1.5" onClick={() => setConfirmOpen(false)} style={{ border: `1px solid ${colors.border}` }}>
                Cancel
              </button>
              <button
                className="rounded-md px-3 py-1.5 text-white"
                style={{ backgroundColor: '#d32f2f' }}
                onClick={async () => {
                  try {
                    const res = await apiClient.delete<{ success: boolean; data?: { id: string } }>(`/api/v1/bills/payees/${payee.id}`)
                    if ((res as any)?.success) {
                      onDeleted(payee.id)
                    }
                  } finally {
                    setConfirmOpen(false)
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
