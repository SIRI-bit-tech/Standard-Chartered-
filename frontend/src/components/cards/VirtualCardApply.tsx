 'use client'
 
 import { useEffect, useState } from 'react'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
 import { apiClient } from '@/lib/api-client'
 import { logger } from '@/lib/logger'
 import type { Account, VirtualCardType, VirtualCardSummary } from '@/types'
 import { colors } from '@/types'
 import { VirtualCard3D } from '@/components/cards/VirtualCard3D'
 
 interface Props {
   onCreated: () => void
 }
 
 export function VirtualCardApply({ onCreated }: Props) {
   const [accounts, setAccounts] = useState<Account[]>([])
   const [form, setForm] = useState({
     account_id: '',
     card_type: 'debit' as VirtualCardType,
     card_name: '',
     daily_limit: '',
     monthly_limit: '',
   })
   const [busy, setBusy] = useState(false)
  const [cards, setCards] = useState<VirtualCardSummary[]>([])
  const existingTypes = new Set(cards.map((c) => c.card_type))
  const blockedNotExpired = cards.some(
    (c) =>
      (c.status === 'blocked' || c.status === 'suspended') &&
      (c.expiry_year > new Date().getFullYear() ||
        (c.expiry_year === new Date().getFullYear() && c.expiry_month >= new Date().getMonth() + 1)),
  )
  const hasBothTypes = existingTypes.has('debit') && existingTypes.has('credit')
 
  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiClient.get<{ success: boolean; data: Account[] }>(`/api/v1/accounts`)
        if (res.success && Array.isArray(res.data)) setAccounts(res.data)
      } catch (e) {
        logger.error('Failed to fetch accounts', { error: e })
      }
    })()
    ;(async () => {
      try {
        const resp = await apiClient.get<{ cards: VirtualCardSummary[] }>(`/api/v1/cards/list`)
        const list = (resp as any)?.cards ?? []
        if (Array.isArray(list)) setCards(list)
      } catch (e) {
        logger.error('Failed to fetch cards', { error: e })
      }
    })()
  }, [])

  async function submit() {
    if (!form.account_id || !form.card_name) return
    setBusy(true)
    try {
      const payload = {
        account_id: form.account_id,
        card_type: form.card_type,
        card_name: form.card_name,
        daily_limit: form.daily_limit ? parseFloat(form.daily_limit) : undefined,
        monthly_limit: form.monthly_limit ? parseFloat(form.monthly_limit) : undefined,
        requires_3d_secure: true,
      }
      const res = await apiClient.post(`/api/v1/cards/create`, payload) as { success: boolean; data?: { id: string } }
      if (res.success && res.data?.id) {
        onCreated()
      }
    } catch (e) {
      logger.error('Create virtual card failed', { error: e })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div>
          <label className="text-sm" style={{ color: colors.textSecondary }}>
            Card Type
          </label>
          <Select value={form.card_type} onValueChange={(v: any) => setForm({ ...form, card_type: v })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="debit" disabled={existingTypes.has('debit')}>
                Debit
              </SelectItem>
              <SelectItem value="credit" disabled={existingTypes.has('credit')}>
                Credit
              </SelectItem>
            </SelectContent>
          </Select>
          {hasBothTypes && (
            <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
              You already have both cards.
            </p>
          )}
          {blockedNotExpired && (
            <p className="mt-1 text-xs" style={{ color: colors.error }}>
              You cannot apply while a card is blocked and not expired.
            </p>
          )}
        </div>

        <div>
          <label className="text-sm" style={{ color: colors.textSecondary }}>
            Linked Account
          </label>
          <Select value={form.account_id} onValueChange={(v: any) => setForm({ ...form, account_id: v })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.account_number} • {a.currency} • {Number.isFinite(Number(a.balance)) ? Number(a.balance).toFixed(2) : '0.00'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm" style={{ color: colors.textSecondary }}>
            Card Name
          </label>
          <Input value={form.card_name} onChange={(e) => setForm({ ...form, card_name: e.target.value })} placeholder="e.g., Online Shopping" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm" style={{ color: colors.textSecondary }}>
              Daily Limit
            </label>
            <Input type="number" value={form.daily_limit} onChange={(e) => setForm({ ...form, daily_limit: e.target.value })} placeholder="e.g., 1500" />
          </div>
          <div>
            <label className="text-sm" style={{ color: colors.textSecondary }}>
              Monthly Limit
            </label>
            <Input type="number" value={form.monthly_limit} onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })} placeholder="e.g., 5000" />
          </div>
        </div>

        <Button className="w-full" disabled={busy || hasBothTypes || blockedNotExpired} onClick={submit}>
          Apply
        </Button>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm font-semibold">Live Preview</div>
        <div className="mt-3">
          <VirtualCardApplyPreview
            name={form.card_name || 'Standard Chartered'}
            type={form.card_type}
          />
        </div>
      </div>
    </div>
  )
}

function VirtualCardApplyPreview({ name, type }: { name: string; type: VirtualCardType }) {
  const card: any = {
    card_name: name,
    card_number: '',
    expiry_month: 0,
    expiry_year: 0,
     status: 'pending',
     card_type: type,
   }
   return <div className="mt-2"><VirtualCard3D card={card} /></div>
 }
