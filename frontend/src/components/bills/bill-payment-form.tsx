import { useState } from 'react'
import { colors } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { TransferPinModal } from '@/components/transfers/transfer-pin-modal'
import { apiClient } from '@/lib/api-client'
import { PayeeDirectory } from './payee-directory'

export interface BillPayFormValues {
  payeeId: string
  fromAccountId: string
  amount: number
  paymentDate: string
  note?: string
}

export function BillPaymentForm({
  payees,
  accounts,
  onSuccess,
}: {
  payees: Array<{ id: string; name: string; account_number?: string; category?: string }>
  accounts: Array<{ id: string; nickname?: string; account_number: string; available_balance: number; currency: string }>
  onSuccess: () => Promise<void> | void
}) {
  const [values, setValues] = useState<BillPayFormValues>({
    payeeId: payees[0]?.id || '',
    fromAccountId: accounts[0]?.id || '',
    amount: 0,
    paymentDate: new Date().toISOString().slice(0, 10),
    note: '',
  })
  const [pinOpen, setPinOpen] = useState(false)
  const [pinError, setPinError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dirOpen, setDirOpen] = useState(false)

  const selectedPayee = payees.find((p) => p.id === values.payeeId)

  const clearForm = () => {
    setValues((v) => ({ ...v, amount: 0, note: '' }))
  }

  const submitWithPin = async (pin: string) => {
    setPinError('')
    setSubmitting(true)
    try {
      await apiClient.post('/api/v1/auth/verify-transfer-pin', { transfer_pin: pin })
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Invalid transfer PIN'
      setPinError(msg)
      setSubmitting(false)
      throw new Error('PIN verification failed')
    }

    try {
      const payload = {
        account_id: values.fromAccountId,
        payee_id: values.payeeId,
        amount: values.amount,
        payment_date: values.paymentDate,
        reference: values.note || undefined,
        transfer_pin: pin,
      }
      const res = await apiClient.post('/api/v1/bills/pay', payload)
      if ((res as any)?.success) {
        clearForm()
        await onSuccess()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border p-6" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
      <h3 className="mb-4 text-lg font-semibold" style={{ color: colors.textPrimary }}>Make a Payment</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium" style={{ color: colors.textSecondary }}>Select Payee</label>
            <button
              type="button"
              onClick={() => setDirOpen(true)}
              className="text-xs underline"
              style={{ color: colors.textSecondary }}
            >
              Browse Directory
            </button>
          </div>
          <select
            value={values.payeeId}
            onChange={(e) => setValues((v) => ({ ...v, payeeId: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2"
            style={{ borderColor: colors.border }}
          >
            {payees.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="mt-2 text-xs" style={{ color: colors.textSecondary }}>
            Customer/Bill Number: {selectedPayee?.account_number ? `****${selectedPayee.account_number.slice(-4)}` : '—'}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: colors.textSecondary }}>From Account</label>
          <select
            value={values.fromAccountId}
            onChange={(e) => setValues((v) => ({ ...v, fromAccountId: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2"
            style={{ borderColor: colors.border }}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {(a.nickname || 'Account')} • ****{a.account_number.slice(-4)} ({formatCurrency(a.available_balance, a.currency)})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: colors.textSecondary }}>Amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.amount === 0 ? '' : values.amount}
            onChange={(e) => setValues((v) => ({ ...v, amount: parseFloat(e.target.value || '0') }))}
            className="w-full rounded-lg border px-3 py-2"
            style={{ borderColor: colors.border }}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: colors.textSecondary }}>Payment Date</label>
          <input
            type="date"
            value={values.paymentDate}
            onChange={(e) => setValues((v) => ({ ...v, paymentDate: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2"
            style={{ borderColor: colors.border }}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium" style={{ color: colors.textSecondary }}>Note (Optional)</label>
          <input
            type="text"
            value={values.note}
            onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
            placeholder="e.g., November 2026 Bill"
            className="w-full rounded-lg border px-3 py-2"
            style={{ borderColor: colors.border }}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={clearForm}
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ border: `1px solid ${colors.border}`, color: colors.textPrimary }}
        >
          Clear Form
        </button>
        <button
          type="button"
          onClick={() => setPinOpen(true)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: colors.primary }}
          disabled={values.amount <= 0 || !values.payeeId || !values.fromAccountId}
        >
          Pay Now
        </button>
      </div>
      <TransferPinModal
        open={pinOpen}
        onOpenChange={(o) => { setPinOpen(o); setPinError('') }}
        onConfirm={submitWithPin}
        error={pinError}
        onClearError={() => setPinError('')}
      />
      <PayeeDirectory
        open={dirOpen}
        onOpenChange={setDirOpen}
        onAdded={async (p) => {
          // Refresh payees and select the newly added one
          try {
            const r = await apiClient.get<{ success: boolean; data: any[] }>('/api/v1/bills/payees')
            if (r?.success) {
              // Find new payee by id
              const added = (r.data || []).find((x: any) => x.id === p.id)
              if (added) {
                setValues((v) => ({ ...v, payeeId: added.id }))
              }
            }
          } catch {}
          await onSuccess()
        }}
      />
    </div>
  )
}
