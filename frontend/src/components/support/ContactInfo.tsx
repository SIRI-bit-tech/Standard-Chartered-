import type { BranchOffice } from '@/types'
import { colors } from '@/types'

export function ContactInfo({ branches }: { branches: BranchOffice[] }) {
  return (
    <div className="rounded-xl border bg-white p-4" style={{ borderColor: colors.border }}>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-sm font-semibold">Contact Info</div>
          <div className="text-sm">Email: support@standardchartered.example</div>
          <div className="text-sm">Phone: +1 (800) 555-0102</div>
          <div className="text-sm">Hours: 24/7 for premium members</div>
        </div>
        <div>
          <div className="text-sm font-semibold mb-2">Global Branches</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {branches.map((b) => (
              <div key={b.id} className="rounded border p-3" style={{ borderColor: colors.borderLight }}>
                <div className="text-sm font-medium">
                  {b.city}, {b.country}
                </div>
                <div className="text-xs text-muted-foreground">{b.address}</div>
                <div className="text-xs mt-1">Phone: {b.phone}</div>
                {b.email ? <div className="text-xs">Email: {b.email}</div> : null}
                {b.hours ? <div className="text-xs">Hours: {b.hours}</div> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
