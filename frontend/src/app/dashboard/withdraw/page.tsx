'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useAccountStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { FromAccountSelect } from '@/components/transfers/from-account-select'
import { AmountInput } from '@/components/transfers/amount-input'
import { SectionCard } from '@/components/transfers/section-card'
import { TransferSummaryCard } from '@/components/transfers/transfer-summary-card'
import { TransferPinModal } from '@/components/transfers/transfer-pin-modal'
import { ResetPinModal } from '@/components/transfers/reset-pin-modal'
import { ReceiptModal } from '@/components/transfers/receipt-modal'
import { colors, type Account, type TransferSummaryState } from '@/types'
import { getCurrencyFromCountry } from '@/lib/utils'
import { parseApiError } from '@/utils/error-handler'

interface InternalWithdrawForm {
  from_account_id: string
  to_account_id: string
  amount: number
  reference_memo: string
}

export default function WithdrawPage() {
  const { user } = useAuthStore()
  const { setAccounts } = useAccountStore()
  const { toast } = useToast()

  const [accountsList, setAccountsList] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [resetPinOpen, setResetPinOpen] = useState(false)
  const [pinError, setPinError] = useState('')
  const [error, setError] = useState('')
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<any | null>(null)

  const [form, setForm] = useState<InternalWithdrawForm>({
    from_account_id: '',
    to_account_id: '',
    amount: 0,
    reference_memo: '',
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id) return
      setLoadingAccounts(true)
      try {
        const res = await apiClient.get<{ success: boolean; data: Account[] }>('/api/v1/accounts/')
        if (cancelled) return
        if (res.success && Array.isArray(res.data)) {
          setAccountsList(res.data)
          setAccounts(res.data)
        }
      } catch (e) {
        console.error('Failed to load accounts:', e)
      } finally {
        if (!cancelled) setLoadingAccounts(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id, setAccounts])

  const primaryAccount = accountsList.find((a) => a.is_primary) ?? accountsList[0]
  const currency = user?.primary_currency && user?.primary_currency !== 'USD'
    ? user?.primary_currency
    : (primaryAccount?.currency || getCurrencyFromCountry(user?.country))

  const ownAccountsExcludingFrom = accountsList.filter((a) => a.id !== form.from_account_id)

  const summary: TransferSummaryState = {
    amount: form.amount,
    fee: 0,
    totalToPay: form.amount,
    estimatedDelivery: 'Instant',
    currency,
  }

  const validate = (): string | null => {
    if (form.amount <= 0) return 'Enter a valid amount.'
    if (!form.from_account_id) return 'Select a “From” account.'
    if (!form.to_account_id) return 'Select a “To” account.'
    if (form.from_account_id === form.to_account_id) return 'From and To accounts must be different.'
    return null
  }

  const handleReview = () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      setPinError('')
      return
    }
    setError('')
    setPinError('')
    setPinModalOpen(true)
  }

  const handlePinConfirm = async (pin: string) => {
    setPinError('')
    setError('')
    setSubmitting(true)
    try {
      await apiClient.post('/api/v1/auth/verify-transfer-pin', { transfer_pin: pin })

      const payload = {
        transfer_pin: pin,
        from_account_id: form.from_account_id,
        to_account_id: form.to_account_id,
        amount: form.amount,
        description: form.reference_memo || undefined,
      }

      const res = await apiClient.post<{ success: boolean; transfer_id: string; status: string; message: string }>(
        '/api/v1/withdrawals/internal',
        payload,
      )

      if (res.success) {
        setReceiptData({
          id: res.transfer_id,
          status: res.status,
          type: 'internal',
          amount: form.amount,
          currency,
          reference: undefined,
        })
        setReceiptOpen(true)
        setForm({ from_account_id: '', to_account_id: '', amount: 0, reference_memo: '' })
        toast({
          title: 'Withdrawal submitted',
          description: 'Your funds are moving between your accounts.',
        })
      }
    } catch (err) {
      console.error('Withdrawal failed:', err)
      const { message } = parseApiError(err)
      setError(message)
      setReceiptData({
        status: 'failed',
        type: 'internal',
        amount: form.amount,
        currency,
        error: message,
      })
      setReceiptOpen(true)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  const confirmDisabled = !!validate()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: colors.textPrimary }}>
          Withdraw
        </h1>
        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
          Move money between your own accounts.
        </p>
      </div>

      {error ? (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{ borderColor: colors.error, backgroundColor: colors.white, color: colors.error }}
        >
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {loadingAccounts ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <>
              <SectionCard number={1} title="From Account">
                <FromAccountSelect
                  accounts={accountsList}
                  value={form.from_account_id}
                  onChange={(id) => setForm((p) => ({ ...p, from_account_id: id }))}
                />
              </SectionCard>
              <SectionCard number={2} title="To Account & Amount">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                      To Account
                    </Label>
                    <select
                      value={form.to_account_id}
                      onChange={(e) => setForm((p) => ({ ...p, to_account_id: e.target.value }))}
                      className="mt-1.5 w-full rounded-md border px-3 py-2 text-sm"
                      style={{ borderColor: colors.border }}
                    >
                      <option value="">Select destination account</option>
                      {ownAccountsExcludingFrom.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {(acc.nickname || acc.type)} - ****{acc.account_number.slice(-4)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <AmountInput
                    label={`Amount (${currency})`}
                    value={form.amount}
                    onChange={(v) => setForm((p) => ({ ...p, amount: v }))}
                    currency={currency}
                  />
                  <div>
                    <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                      Reference / Memo
                    </Label>
                    <Input
                      placeholder="e.g. Move funds to savings"
                      value={form.reference_memo}
                      onChange={(e) => setForm((p) => ({ ...p, reference_memo: e.target.value }))}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </SectionCard>
            </>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <TransferSummaryCard
              summary={summary}
              onConfirm={handleReview}
              confirmLabel="Review Withdrawal"
              disclaimer="Transfers between your own accounts are processed instantly in most cases."
              secureMessage="Secure transaction handled by 256-bit SSL."
              loading={submitting}
              confirmDisabled={confirmDisabled}
            />
          </div>
        </div>
      </div>

      <TransferPinModal
        open={pinModalOpen}
        onOpenChange={setPinModalOpen}
        onConfirm={handlePinConfirm}
        error={pinError}
        onClearError={() => setPinError('')}
        onForgotPin={() => setResetPinOpen(true)}
      />

      <ResetPinModal open={resetPinOpen} onOpenChange={setResetPinOpen} />

      <ReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        data={receiptData || { status: 'unknown', type: 'internal', amount: 0, currency }}
      />
    </div>
  )
}

