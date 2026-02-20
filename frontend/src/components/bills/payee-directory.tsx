import { useEffect, useMemo, useState } from 'react'
import { colors } from '@/types'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import { COUNTRIES } from '@/constants'

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
  const [countryCode, setCountryCode] = useState('')

  const norm = (value?: string) => (value || '').toString().trim().toLowerCase()
  const resolveCountryCode = (value?: string) => {
    const v = norm(value)
    if (!v) return ''
    const byCode = COUNTRIES.find((c) => c.code.toLowerCase() === v)
    if (byCode) return byCode.code
    const byName = COUNTRIES.find((c) => norm(c.name) === v)
    return byName?.code || ''
  }

  useEffect(() => {
    if (!open) return
    const resolved = resolveCountryCode(user?.country)
    if (resolved && resolved !== countryCode) setCountryCode(resolved)
    if (!resolved && !countryCode) setCountryCode('US')
  }, [open, user?.country, countryCode])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams()
    if (countryCode) params.set('country', countryCode)
    if (category) params.set('category', category)
    if (q.trim()) params.set('q', q.trim())
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
  }, [open, category, q, countryCode])

  const preferredCategories = useMemo(() => ['utilities', 'telecom', 'internet', 'insurance', 'government/taxes'], [])
  const cats = useMemo(() => {
    const found = new Set(items.map((item) => (item.category || '').toLowerCase()).filter(Boolean))
    const ordered = preferredCategories.filter((c) => found.has(c))
    const extras = Array.from(found).filter((c) => !preferredCategories.includes(c)).sort()
    return [...ordered, ...extras]
  }, [items, preferredCategories])

  useEffect(() => {
    if (category && !cats.includes(category)) setCategory('')
  }, [cats])

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
          <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>Select Payee</h3>
          <button className="text-sm underline" onClick={() => onOpenChange(false)} style={{ color: colors.textSecondary }}>
            Close
          </button>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border px-3 py-2"
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
            placeholder="Search payee name"
            className="rounded-lg border px-3 py-2 sm:col-span-2"
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
              placeholder="Enter the account number printed on the bill"
              className="w-full rounded-lg border px-3 py-2"
              style={{ borderColor: colors.border }}
            />
          </div>
        </div>
        <div className="max-h-80 overflow-auto rounded-lg border" style={{ borderColor: colors.border }}>
          {loading ? (
            <div className="p-6 text-center text-sm" style={{ color: colors.textSecondary }}>Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm" style={{ color: colors.textSecondary }}>No payees found</div>
          ) : (
            <ul className="divide-y" style={{ borderColor: colors.border }}>
              {items.map((p) => (
                <li key={p.payee_code} className="flex items-center justify-between p-3">
                  <div>
                    <div className="font-medium" style={{ color: colors.textPrimary }}>{p.name}</div>
                    <div className="text-xs" style={{ color: colors.textSecondary }}>{(p.category || '').toUpperCase()}</div>
                  </div>
                  <button
                    onClick={() => add(p.payee_code)}
                    disabled={adding === p.payee_code}
                    className="rounded-md px-3 py-1.5 text-sm font-medium"
                    style={{ color: colors.primary, border: `1px solid ${colors.border}` }}
                  >
                    {adding === p.payee_code ? 'Adding…' : 'Add Payee'}
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
