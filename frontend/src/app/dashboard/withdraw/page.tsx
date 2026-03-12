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
import { useCryptoPrice } from '@/hooks/use-crypto-price'
import { QrCode, Clipboard } from 'lucide-react'

interface InternalWithdrawForm {
  from_account_id: string
  to_account_id: string
  amount: number
  reference_memo: string
  to_external_wallet: boolean
  wallet_address: string
}

export default function WithdrawPage() {
  const { user } = useAuthStore()
  const { setAccounts } = useAccountStore()
  const { toast } = useToast()
  const { price: btcPrice } = useCryptoPrice()

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
    to_external_wallet: false,
    wallet_address: '',
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

  const sourceAccount = accountsList.find((a) => a.id === form.from_account_id)
  const destAccount = accountsList.find((a) => a.id === form.to_account_id)

  const isFromCrypto = sourceAccount?.type === 'crypto'
  const isToCrypto = destAccount?.type === 'crypto'

  const primaryAccount = accountsList.find((a) => a.is_primary) ?? accountsList[0]
  const fiatCurrency = user?.primary_currency && user?.primary_currency !== 'USD'
    ? user?.primary_currency
    : (primaryAccount?.currency || getCurrencyFromCountry(user?.country))

  const displayCurrency = isFromCrypto ? 'BTC' : fiatCurrency

  const ownAccountsExcludingFrom = accountsList.filter((a) => a.id !== form.from_account_id)

  const summary: TransferSummaryState = {
    amount: form.amount,
    fee: 0,
    totalToPay: form.amount,
    estimatedDelivery: form.to_external_wallet ? '15-60 mins' : 'Instant',
    currency: displayCurrency,
  }

  const validate = (): string | null => {
    if (form.amount <= 0) return 'Enter a valid amount.'
    if (!form.from_account_id) return 'Select a “From” account.'
    if (form.to_external_wallet) {
      if (!form.wallet_address || form.wallet_address.length < 10) return 'Enter a valid BTC wallet address.'
    } else {
      if (!form.to_account_id) return 'Select a “To” account.'
      if (form.from_account_id === form.to_account_id) return 'From and To accounts must be different.'
    }
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

      let res: any
      if (form.to_external_wallet || isFromCrypto) {
        // Use crypto-withdraw endpoint for anything moving BTC
        const payload = {
          transfer_pin: pin,
          from_account_id: form.from_account_id,
          amount_btc: form.amount,
          destination_address: form.to_external_wallet ? form.wallet_address : undefined,
          destination_account_id: form.to_external_wallet ? undefined : form.to_account_id,
        }
        res = await apiClient.post('/api/v1/transfers/crypto-withdraw', payload)
      } else {
        // Standard internal withdrawal (handles Fiat -> Crypto internally now)
        const payload = {
          transfer_pin: pin,
          from_account_id: form.from_account_id,
          to_account_id: form.to_account_id,
          amount: form.amount,
          description: form.reference_memo || undefined,
        }
        res = await apiClient.post('/api/v1/withdrawals/internal', payload)
      }

      if (res.success) {
        setReceiptData({
          id: res.transfer_id || res.data?.transfer_id,
          status: res.status || 'processing',
          type: form.to_external_wallet ? 'external' : 'internal',
          amount: form.amount,
          currency: displayCurrency,
          reference: res.reference || res.data?.reference,
        })
        setReceiptOpen(true)
        setForm({
          from_account_id: '',
          to_account_id: '',
          amount: 0,
          reference_memo: '',
          to_external_wallet: false,
          wallet_address: '',
        })
        toast({
          title: 'Withdrawal submitted',
          description: 'Your request is being processed.',
        })
      }
    } catch (err) {
      console.error('Withdrawal failed:', err)
      const { message } = parseApiError(err)
      setError(message)
      setReceiptData({
        status: 'failed',
        type: 'withdrawal',
        amount: form.amount,
        currency: displayCurrency,
        error: message,
      })
      setReceiptOpen(true)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasteAddress = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setForm(p => ({ ...p, wallet_address: text }))
    } catch (e) {
      toast({ title: 'Clipboard access denied' })
    }
  }

  if (!user) return null

  const confirmDisabled = !!validate()

  const conversionText = () => {
    if (form.amount <= 0) return null
    if (isFromCrypto) {
      return (
        <span className="text-xs font-semibold text-emerald-600">
          ≈ {(form.amount * btcPrice).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
        </span>
      )
    }
    if (isToCrypto) {
      return (
        <span className="text-xs font-semibold text-emerald-600">
          ≈ {(form.amount / btcPrice).toFixed(8)} BTC
        </span>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: colors.textPrimary }}>
          Withdraw
        </h1>
        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
          Move money between your accounts or to an external wallet.
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
                  onChange={(id) => {
                    setForm((p) => ({ 
                      ...p, 
                      from_account_id: id,
                      to_account_id: '',
                      to_external_wallet: false 
                    }))
                  }}
                />
              </SectionCard>
              <SectionCard number={2} title="To Account & Amount">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                      To Account
                    </Label>
                    <select
                      value={form.to_external_wallet ? 'external' : form.to_account_id}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === 'external') {
                          setForm((p) => ({ ...p, to_external_wallet: true, to_account_id: '' }))
                        } else {
                          setForm((p) => ({ ...p, to_external_wallet: false, to_account_id: val }))
                        }
                      }}
                      className="mt-1.5 w-full rounded-md border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      style={{ borderColor: colors.border }}
                    >
                      <option value="">Select destination</option>
                      {ownAccountsExcludingFrom.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {(acc.nickname || acc.type).toUpperCase()} Account - ****{acc.account_number.slice(-4)}
                        </option>
                      ))}
                      {isFromCrypto && (
                        <option value="external" className="font-semibold text-primary">
                          ✨ External BTC Wallet
                        </option>
                      )}
                    </select>
                  </div>

                  {form.to_external_wallet && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                        BTC Wallet Address
                      </Label>
                      <div className="relative group">
                        <Input
                          placeholder="Enter or paste long-format BTC address"
                          value={form.wallet_address}
                          onChange={(e) => setForm((p) => ({ ...p, wallet_address: e.target.value }))}
                          className="pr-20"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <button 
                            type="button" 
                            onClick={handlePasteAddress}
                            className="p-1 px-1.5 hover:bg-gray-100 rounded text-xs text-primary font-medium flex items-center gap-1"
                          >
                            <Clipboard className="h-3 w-3" /> PASTE
                          </button>
                          <button 
                            type="button" 
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-400"
                            onClick={() => toast({ title: 'Scanner', description: 'Camera access requested. Please grant permission in browser settings.' })}
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Ensure the address is correct. Crypto transfers cannot be reversed.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <AmountInput
                      label={`Amount (${displayCurrency})`}
                      value={form.amount}
                      onChange={(v) => setForm((p) => ({ ...p, amount: v }))}
                      currency={displayCurrency}
                    />
                    {conversionText()}
                  </div>

                  {!form.to_external_wallet && (
                    <div>
                      <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                        Reference / Memo
                      </Label>
                      <Input
                        placeholder="e.g. Conversion to savings"
                        value={form.reference_memo}
                        onChange={(e) => setForm((p) => ({ ...p, reference_memo: e.target.value }))}
                        className="mt-1.5"
                      />
                    </div>
                  )}
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
              disclaimer={form.to_external_wallet ? "External crypto transfers require blockchain confirmations and are final." : "Transfers between your own accounts are processed instantly."}
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
        data={receiptData || { status: 'unknown', type: 'internal', amount: 0, currency: displayCurrency }}
      />
    </div>
  )
}
