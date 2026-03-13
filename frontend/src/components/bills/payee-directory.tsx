import { useEffect, useMemo, useState } from 'react'
import { colors } from '@/types'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'

export interface CatalogPayee {
  payee_code: string
  name: string
  category?: string
}

export function PayeeDirectory({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  onAdded: (payee: { id: string; name: string }) => void
}) {
  const { user } = useAuthStore()
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const [items, setItems] = useState<CatalogPayee[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [customerAccount, setCustomerAccount] = useState('')

  // Automatically fetch billers for the user's home country
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (q.trim()) params.set('q', q.trim())
    
    // The backend now automatically uses user.country if 'country' param is missing
    apiClient
      .get<{ success: boolean; data: CatalogPayee[] }>(`/api/v1/bills/catalog?${params.toString()}`)
      .then((res) => {
        if (cancelled) return
        if (res?.success) setItems(res.data || [])
        else setItems([])
      })
      .finally(() => !cancelled && setLoading(false))
      
    return () => {
      cancelled = true
    }
  }, [open, category, q])

  const preferredCategories = useMemo(() => ['utilities', 'telecom', 'internet', 'insurance', 'government/taxes'], [])
  const cats = useMemo(() => {
    const found = new Set(items.map((item) => (item.category || '').toLowerCase()).filter(Boolean))
    const ordered = preferredCategories.filter((c) => found.has(c))
    const extras = Array.from(found).filter((c) => !preferredCategories.includes(c)).sort()
    return [...ordered, ...extras]
  }, [items, preferredCategories])

  useEffect(() => {
    if (category && !cats.includes(category)) setCategory('')
  }, [cats, category])

  const add = async (code: string) => {
    if (!customerAccount.trim()) {
      return
    }
    try {
      setAdding(code)
      const res = await apiClient.post<{ success: boolean; data: { id: string } }>(
        '/api/v1/bills/payees/import-from-catalog',
        { payee_code: code, customer_account: customerAccount.trim() },
      )
      if (res?.success) {
        const added = items.find((i) => i.payee_code === code)
        onAdded({ id: res.data.id, name: added?.name || 'Payee' })
        onOpenChange(false)
      }
    } finally {
      setAdding(null)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0" style={{ backgroundColor: '#00000040' }} onClick={() => onOpenChange(false)} />
      <div className="relative z-10 w-full max-w-2xl rounded-xl border bg-white p-4 shadow-lg" style={{ borderColor: colors.border }}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>Browse Directory</h3>
            <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>Showing billers for {user?.country || 'your country'}</p>
          </div>
          <button className="text-sm underline" onClick={() => onOpenChange(false)} style={{ color: colors.textSecondary }}>
            Close
          </button>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: colors.border }}
          >
            <option value="">All Categories</option>
            {cats.map((c) => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by company name..."
            className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
            style={{ borderColor: colors.border }}
          />
        </div>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: colors.textSecondary }}>
              Customer account / bill number
            </label>
            <input
              type="text"
              value={customerAccount}
              onChange={(e) => setCustomerAccount(e.target.value)}
              placeholder="Enter your account number"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: colors.border }}
            />
          </div>
        </div>
        <div className="max-h-80 overflow-auto rounded-lg border" style={{ borderColor: colors.border }}>
          {loading ? (
            <div className="p-6 text-center text-sm" style={{ color: colors.textSecondary }}>Searching directory...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm" style={{ color: colors.textSecondary }}>
              No billers found for {user?.country}. Try a different search term.
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: colors.border }}>
              {items.map((p) => (
                <li key={p.payee_code} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="font-medium" style={{ color: colors.textPrimary }}>{p.name}</div>
                    <div className="text-xs" style={{ color: colors.textSecondary }}>{(p.category || 'Utility').toUpperCase()}</div>
                  </div>
                  <button
                    onClick={() => add(p.payee_code)}
                    disabled={adding === p.payee_code || !customerAccount.trim()}
                    className="rounded-md px-3 py-1.5 text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ 
                      backgroundColor: customerAccount.trim() ? colors.primaryLight : 'transparent',
                      color: colors.primary, 
                      border: `1px solid ${colors.primary}` 
                    }}
                  >
                    {adding === p.payee_code ? 'Linking…' : 'Link Biller'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
