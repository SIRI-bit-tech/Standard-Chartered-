import { PayeeTile, type Payee } from './payee-tile'
import { colors } from '@/types'

export function PayeesGrid({ items, onDeleted }: { items: Payee[]; onDeleted: (id: string) => void }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border p-12 text-center" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
        <p className="text-sm" style={{ color: colors.textSecondary }}>No payees added yet</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <PayeeTile key={p.id} payee={p} onDeleted={onDeleted} />
      ))}
    </div>
  )
}
