'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useAccountStore } from '@/lib/store'
import { TRANSFER_FEES } from '@/constants'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TransferTypeTabs } from '@/components/transfers/transfer-type-tabs'
import { FromAccountSelect } from '@/components/transfers/from-account-select'
import { AmountInput } from '@/components/transfers/amount-input'
import { SectionCard } from '@/components/transfers/section-card'
import { TransferSummaryCard } from '@/components/transfers/transfer-summary-card'
import { InfoBanner } from '@/components/transfers/info-banner'
import { TransferPinModal } from '@/components/transfers/transfer-pin-modal'
import { ResetPinModal } from '@/components/transfers/reset-pin-modal'
import { ReceiptModal } from '@/components/transfers/receipt-modal'
import { colors, type TransferHistoryItem, type TransferHistoryMetrics, type TransferHistoryResponse } from '@/types'
import { getCurrencyFromCountry } from '@/lib/utils'
import { HistoryFilters, type HistoryFilterState } from '@/components/transfers/history-filters'
import { HistoryKpis } from '@/components/transfers/history-kpis'
import { HistoryTable } from '@/components/transfers/history-table'
import { CountrySelector } from '@/components/ui/country-selector'
import { parseApiError } from '@/utils/error-handler'
import { useRestrictionCheck } from '@/hooks/use-restriction-check'
import type {
  Account,
  TransferTypeTab,
  TransferSummaryState,
  DomesticTransferForm,
  InternationalTransferForm,
  ACHTransferForm,
} from '@/types'

// Map tab to fee key
const FEE_KEYS: Record<TransferTypeTab, keyof typeof TRANSFER_FEES> = {
  domestic: 'DOMESTIC',
  international: 'INTERNATIONAL',
  ach: 'ACH',
}

// Estimated delivery copy per type
const ESTIMATED_DELIVERY: Record<TransferTypeTab, string> = {
  domestic: '1-2 business days',
  international: '1-5 business days',
  ach: '1-3 business days',
}

export default function TransfersPage() {
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const { setAccounts } = useAccountStore()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')
  const [transferType, setTransferType] = useState<TransferTypeTab>('domestic')

  const [accountsList, setAccountsList] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string>('')
  const [historyItems, setHistoryItems] = useState<TransferHistoryItem[]>([])
  const [historyMetrics, setHistoryMetrics] = useState<TransferHistoryMetrics | null>(null)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPageSize] = useState(10)
  const [filters, setFilters] = useState<HistoryFilterState>({
    q: '',
    period: 'all',
    type: 'all',
    status: 'all',
  })
  const [submitting, setSubmitting] = useState(false)
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [resetPinOpen, setResetPinOpen] = useState(false)
  const [pinError, setPinError] = useState('')
  const [transferError, setTransferError] = useState('')

  // Form state per type (single design: one active form at a time)
  const [domesticForm, setDomesticForm] = useState<DomesticTransferForm>({
    from_account_id: '',
    recipient_name: '',
    account_type: 'checking',
    bank_name: '',
    routing_number: '',
    account_number: '',
    amount: 0,
    memo: '',
  })
  const [internationalForm, setInternationalForm] = useState<InternationalTransferForm>({
    from_account_id: '',
    beneficiary_name: '',
    swift_bic: '',
    country: '',
    iban_or_account: '',
    bank_name: '',
    amount: 0,
    purpose: '',
  })
  const [achForm, setAchForm] = useState<ACHTransferForm>({
    from_account_id: '',
    recipient_name: '',
    account_type: 'checking',
    bank_name: '',
    routing_number: '',
    account_number: '',
    amount: 0,
  })
  const [routingValid, setRoutingValid] = useState<boolean | null>(null)
  const [routingChecking, setRoutingChecking] = useState(false)
  const [routingErrorMsg, setRoutingErrorMsg] = useState<string>('')
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<any | null>(null)

  // Deep link: /dashboard/transfers?tab=history opens Transfer History tab
  useEffect(() => {
    if (searchParams.get('tab') === 'history') {
      setActiveTab('history')
    }
  }, [searchParams])

  // Load accounts and optionally hydrate account store
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id) return
      setLoadingAccounts(true)
      try {
        const res = await apiClient.get<{ success: boolean; data: Account[] }>(`/api/v1/accounts/`)
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

  // Load transfer history when history tab is active
  useEffect(() => {
    if (activeTab !== 'history' || !user?.id) return
    let cancelled = false

    setHistoryError('')
    setLoadingHistory(true)
    const qs = new URLSearchParams({
      q: filters.q,
      period: filters.period,
      type: filters.type,
      status: filters.status,
      sort: 'desc',
      page: String(historyPage),
      page_size: String(historyPageSize),
    })
    apiClient
      .get<{ success: boolean; data: TransferHistoryResponse }>(`/api/v1/transfers/history?${qs.toString()}`)
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          setHistoryItems(res.data.items || [])
          setHistoryMetrics(res.data.metrics)
          setHistoryTotal(res.data.total || 0)
        }
      })
      .catch((err) => {
        console.error('Failed to load transfer history:', err)
        if (cancelled) return
        setHistoryError('Failed to load transfer history. Please try again.')
        toast({
          title: 'Error',
          description: 'Failed to load transfer history. Please try again.',
          variant: 'destructive',
        })
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeTab, user?.id, filters.q, filters.period, filters.status, filters.type, historyPage, historyPageSize])

  // Sync "from account" into each form when switching type

  const setFromAccountId = (id: string) => {
    setDomesticForm((p) => ({ ...p, from_account_id: id }))
    setInternationalForm((p) => ({ ...p, from_account_id: id }))
    setAchForm((p) => ({ ...p, from_account_id: id }))
  }

  // Current amount and fee for summary (real-time)
  const amount =
    transferType === 'domestic'
      ? domesticForm.amount
      : transferType === 'international'
        ? internationalForm.amount
        : achForm.amount
  const fee = TRANSFER_FEES[FEE_KEYS[transferType]] ?? 0
  const totalToPay = amount + fee
  const primaryAccount = accountsList.find((a) => a.is_primary) ?? accountsList[0]
  const currency = user?.primary_currency && user?.primary_currency !== 'USD'
    ? user?.primary_currency
    : (primaryAccount?.currency || getCurrencyFromCountry(user?.country))

  const summary: TransferSummaryState = {
    amount,
    fee,
    totalToPay,
    estimatedDelivery: ESTIMATED_DELIVERY[transferType],
    currency,
  }

  const validateBeforeReview = (): string | null => {
    if (amount <= 0) return 'Enter a valid amount.'

    if (transferType === 'domestic') {
      if (!domesticForm.from_account_id) return 'Select a “From” account.'
      if (!domesticForm.recipient_name.trim()) return 'Enter the recipient name.'
      if (!domesticForm.bank_name.trim()) return 'Enter the recipient bank name.'
      if (!domesticForm.routing_number.trim()) return 'Enter a routing number.'
      if (!/^\d{9}$/.test(domesticForm.routing_number.trim())) return 'Routing number must be 9 digits.'
      if (routingValid === false) return routingErrorMsg || 'Invalid routing number.'
      if (!domesticForm.account_number.trim()) return 'Enter an account number.'
      if (!/^[0-9]{4,17}$/.test(domesticForm.account_number.trim())) return 'Account number must be 4-17 digits.'
      return null
    }

    if (transferType === 'international') {
      if (!internationalForm.from_account_id) return 'Select a “From” account.'
      if (!internationalForm.beneficiary_name.trim()) return 'Enter the beneficiary name.'
      if (!internationalForm.country.trim()) return 'Select the beneficiary country.'
      if (!internationalForm.swift_bic.trim() && !internationalForm.iban_or_account.trim())
        return 'Enter a SWIFT/BIC or IBAN/account number.'
      return null
    }

    // ACH
    if (!achForm.from_account_id) return 'Select a “From” account.'
    if (!achForm.recipient_name.trim()) return 'Enter the recipient name.'
    if (!achForm.bank_name.trim()) return 'Enter the recipient bank name.'
    if (!achForm.routing_number.trim()) return 'Enter a routing number.'
    if (!/^\d{9}$/.test(achForm.routing_number.trim())) return 'Routing number must be 9 digits.'
    if (routingValid === false) return routingErrorMsg || 'Invalid routing number.'
    if (!achForm.account_number.trim()) return 'Enter an account number.'
    if (!/^[0-9]{4,17}$/.test(achForm.account_number.trim())) return 'Account number must be 4-17 digits.'
    return null
  }

  const confirmDisabled = validateBeforeReview() != null

  // Add restriction check
  const { checkPostNoDebit } = useRestrictionCheck()

  // Open PIN modal when user clicks Review/Confirm (no header/breadcrumb as per requirements)
  const handleReviewTransfer = () => {
    // Check for PND restriction first
    if (checkPostNoDebit()) {
      return // Modal will be shown by the hook
    }

    const validationError = validateBeforeReview()
    if (validationError) {
      setTransferError(validationError)
      setPinError('')
      return
    }

    setTransferError('')
    setPinError('')
    setPinModalOpen(true)
  }

  const handlePinConfirm = async (pin: string) => {
    setPinError('')
    setTransferError('')
    setSubmitting(true)
    try {
      await apiClient.post('/api/v1/auth/verify-transfer-pin', { transfer_pin: pin })
    } catch (e: unknown) {
      const { message } = parseApiError(e)
      setPinError(message)
      setSubmitting(false)
      throw new Error(message)
    }

    try {
      if (transferType === 'domestic') {
        const payload = {
          transfer_pin: pin,
          from_account_id: domesticForm.from_account_id,
          routing_number: domesticForm.routing_number,
          account_number: domesticForm.account_number,
          bank_name: domesticForm.bank_name,
          account_holder: domesticForm.recipient_name,
          amount: domesticForm.amount,
          description: domesticForm.memo || undefined,
        }
        const res = await apiClient.post<{ success: boolean; data?: { transfer_id: string; reference: string }; message?: string }>(
          '/api/v1/transfers/domestic',
          payload,
        )
        if (res.success) {
          const receiptRef = res.data?.reference
          const receiptAmt = domesticForm.amount
          setReceiptData({
            id: res.data?.transfer_id,
            status: 'processing',
            type: 'domestic',
            amount: receiptAmt,
            currency,
            reference: receiptRef,
          })
          setReceiptOpen(true)
          setDomesticForm({
            from_account_id: '',
            recipient_name: '',
            account_type: 'checking',
            bank_name: '',
            routing_number: '',
            account_number: '',
            amount: 0,
            memo: '',
          })

        }
      } else if (transferType === 'international') {
        const payload = {
          transfer_pin: pin,
          from_account_id: internationalForm.from_account_id,
          beneficiary_name: internationalForm.beneficiary_name,
          beneficiary_bank_name: internationalForm.bank_name,
          beneficiary_account_number: internationalForm.iban_or_account,
          beneficiary_country: internationalForm.country.slice(0, 2).toUpperCase(),
          amount: internationalForm.amount,
          target_currency: currency,
          swift_code: internationalForm.swift_bic || undefined,
          iban: internationalForm.iban_or_account || undefined,
          purpose: internationalForm.purpose || undefined,
        }
        const res = await apiClient.post<{ success: boolean; data?: { transfer_id: string; reference: string }; message?: string }>(
          '/api/v1/transfers/international',
          payload,
        )
        if (res.success) {
          const receiptRef = res.data?.reference
          const receiptAmt = internationalForm.amount
          setReceiptData({
            id: res.data?.transfer_id,
            status: 'processing',
            type: 'international',
            amount: receiptAmt,
            currency,
            reference: receiptRef,
          })
          setReceiptOpen(true)
          setInternationalForm({
            from_account_id: '',
            beneficiary_name: '',
            swift_bic: '',
            country: '',
            iban_or_account: '',
            bank_name: '',
            amount: 0,
            purpose: '',
          })

        }
      } else {
        const payload = {
          transfer_pin: pin,
          from_account_id: achForm.from_account_id,
          routing_number: achForm.routing_number,
          account_number: achForm.account_number,
          bank_name: achForm.bank_name,
          account_holder: achForm.recipient_name,
          amount: achForm.amount,
          description: achForm.description || undefined,
        }
        const res = await apiClient.post<{ success: boolean; transfer_id?: string; message?: string }>(
          '/api/v1/transfers/ach',
          payload,
        )
        if (res.success) {
          const receiptAmt = achForm.amount
          setReceiptData({
            id: res.transfer_id,
            status: 'processing',
            type: 'ach',
            amount: receiptAmt,
            currency,
          })
          setReceiptOpen(true)
          setAchForm({
            from_account_id: '',
            recipient_name: '',
            account_type: 'checking',
            bank_name: '',
            routing_number: '',
            account_number: '',
            amount: 0,
            description: '',
          })

        }
      }
    } catch (err) {
      console.error('Transfer failed:', err)
      const { message } = parseApiError(err)
      setTransferError(message)
      setReceiptData({
        status: 'failed',
        type: transferType,
        amount,
        currency,
        error: message,
      })
      setReceiptOpen(true)

      throw err
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page title - no breadcrumb, no header per requirements */}
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: colors.textPrimary }}>
          Move Money
        </h1>
        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
          Transfer to other recipients or external accounts.
        </p>
      </div>

      {transferError ? (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{ borderColor: colors.error, backgroundColor: colors.white, color: colors.error }}
        >
          {transferError}
        </div>
      ) : null}

      {/* New transfer vs History tabs */}
      <div className="flex gap-4 border-b" style={{ borderColor: colors.border }}>
        <button
          type="button"
          onClick={() => setActiveTab('new')}
          className="border-b-2 pb-2 text-sm font-medium transition-colors"
          style={{
            borderColor: activeTab === 'new' ? colors.primary : 'transparent',
            color: activeTab === 'new' ? colors.primary : colors.textSecondary,
          }}
        >
          New Transfer
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className="border-b-2 pb-2 text-sm font-medium transition-colors"
          style={{
            borderColor: activeTab === 'history' ? colors.primary : 'transparent',
            color: activeTab === 'history' ? colors.primary : colors.textSecondary,
          }}
        >
          Transfer History
        </button>
      </div>

      {activeTab === 'new' && (
        <>
          <TransferTypeTabs value={transferType} onChange={setTransferType} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-6">
              {loadingAccounts ? (
                <Skeleton className="h-64 w-full rounded-xl" />
              ) : (
                <>
                  {transferType === 'domestic' && (
                    <>
                      <SectionCard number={1} title="Transfer Details">
                        <InfoBanner
                          message="Domestic wire transfers typically take 1-2 business days. A fee of $15-$30 will be charged."
                        />
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <FromAccountSelect
                            accounts={accountsList}
                            value={domesticForm.from_account_id}
                            onChange={(id) => {
                              setFromAccountId(id)
                              setDomesticForm((p) => ({ ...p, from_account_id: id }))
                            }}
                          />
                          <div>
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Recipient Name
                            </Label>
                            <Input
                              placeholder="Enter full name"
                              value={domesticForm.recipient_name}
                              onChange={(e) => setDomesticForm((p) => ({ ...p, recipient_name: e.target.value }))}
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Recipient Bank Name
                            </Label>
                            <Input
                              placeholder="Enter bank name"
                              value={domesticForm.bank_name}
                              onChange={(e) => setDomesticForm((p) => ({ ...p, bank_name: e.target.value }))}
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Account Type
                            </Label>
                            <Select
                              value={domesticForm.account_type}
                              onValueChange={(v: 'checking' | 'savings') => setDomesticForm((p) => ({ ...p, account_type: v }))}
                            >
                              <SelectTrigger className="mt-1.5 w-full" style={{ borderColor: colors.border }}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="checking">Checking</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <>
                            <div>
                              <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                                Recipient Routing Number (9 digits)
                              </Label>
                              <Input
                                placeholder="000000000"
                                maxLength={9}
                                value={domesticForm.routing_number}
                                onChange={async (e) => {
                                  const val = e.target.value.replace(/\D/g, '')
                                  setDomesticForm((p) => ({ ...p, routing_number: val }))
                                  setRoutingErrorMsg('')
                                  setRoutingValid(null)
                                  if (val.length === 9) {
                                    try {
                                      setRoutingChecking(true)
                                      const resp = await apiClient.get<{ valid: boolean; bank_name?: string }>(`/api/v1/transfers/validate-routing?number=${val}`)
                                      const isValid = !!resp?.valid
                                      setRoutingValid(isValid)
                                      if (isValid && resp.bank_name) {
                                        setDomesticForm((p) => ({ ...p, bank_name: resp.bank_name || p.bank_name }))
                                      }
                                      if (!isValid) setRoutingErrorMsg('Invalid routing number')
                                    } catch {
                                      setRoutingValid(false)
                                      setRoutingErrorMsg('Validation service unavailable')
                                    } finally {
                                      setRoutingChecking(false)
                                    }
                                  }
                                }}
                                className="mt-1.5"
                              />
                              {routingChecking && <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>Validating routing number…</p>}
                              {routingValid === false && <p className="mt-1 text-xs" style={{ color: colors.error }}>{routingErrorMsg || 'Invalid routing number'}</p>}
                              {routingValid && <p className="mt-1 text-xs" style={{ color: colors.success }}>Routing number recognized</p>}
                            </div>
                            <div>
                              <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                                Recipient Account Number
                              </Label>
                              <Input
                                placeholder="Enter account number"
                                value={domesticForm.account_number}
                                onChange={(e) => setDomesticForm((p) => ({ ...p, account_number: e.target.value }))}
                                className="mt-1.5"
                              />
                            </div>
                          </>
                          <div className="sm:col-span-2">
                            <AmountInput
                              label={`Amount (${currency})`}
                              value={domesticForm.amount}
                              onChange={(v) => setDomesticForm((p) => ({ ...p, amount: v }))}
                              currency={currency}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Memo (Optional)
                            </Label>
                            <Input
                              placeholder="Reference for recipient"
                              value={domesticForm.memo || ''}
                              onChange={(e) => setDomesticForm((p) => ({ ...p, memo: e.target.value }))}
                              className="mt-1.5"
                            />
                          </div>
                        </div>
                      </SectionCard>
                    </>
                  )}

                  {transferType === 'international' && (
                    <>
                      <SectionCard number={1} title="Sender Information">
                        <FromAccountSelect
                          accounts={accountsList}
                          value={internationalForm.from_account_id}
                          onChange={(id) => {
                            setFromAccountId(id)
                            setInternationalForm((p) => ({ ...p, from_account_id: id }))
                          }}
                        />
                      </SectionCard>
                      <SectionCard number={2} title="Beneficiary Details">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Beneficiary Name
                            </Label>
                            <Input
                              placeholder="Full legal name"
                              value={internationalForm.beneficiary_name}
                              onChange={(e) => setInternationalForm((p) => ({ ...p, beneficiary_name: e.target.value }))}
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              SWIFT/BIC Code
                            </Label>
                            <Input
                              placeholder="8 or 11 characters"
                              value={internationalForm.swift_bic}
                              onChange={(e) => setInternationalForm((p) => ({ ...p, swift_bic: e.target.value }))}
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Country
                            </Label>
                            <div className="mt-1.5">
                              <CountrySelector
                                value={internationalForm.country}
                                onChange={(code) => setInternationalForm((p) => ({ ...p, country: code }))}
                                placeholder="Select destination country"
                                className="w-full"
                                returnType="code"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              IBAN / Account Number
                            </Label>
                            <Input
                              placeholder="Account identifier"
                              value={internationalForm.iban_or_account}
                              onChange={(e) => setInternationalForm((p) => ({ ...p, iban_or_account: e.target.value }))}
                              className="mt-1.5"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Bank Name
                            </Label>
                            <Input
                              placeholder="Receiving bank full name"
                              value={internationalForm.bank_name}
                              onChange={(e) => setInternationalForm((p) => ({ ...p, bank_name: e.target.value }))}
                              className="mt-1.5"
                            />
                          </div>
                        </div>
                      </SectionCard>
                      <SectionCard number={3} title="Transfer Amount & Purpose">
                        <div className="space-y-4">
                          <AmountInput
                            label={`Amount to Send (${currency})`}
                            value={internationalForm.amount}
                            onChange={(v) => setInternationalForm((p) => ({ ...p, amount: v }))}
                            currency={currency}
                          />
                          <div>
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Purpose of Transfer
                            </Label>
                            <Select
                              value={internationalForm.purpose}
                              onValueChange={(v) => setInternationalForm((p) => ({ ...p, purpose: v }))}
                            >
                              <SelectTrigger className="mt-1.5 w-full" style={{ borderColor: colors.border }}>
                                <SelectValue placeholder="Select purpose" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Family support">Family support</SelectItem>
                                <SelectItem value="Business">Business</SelectItem>
                                <SelectItem value="Investment">Investment</SelectItem>
                                <SelectItem value="Education">Education</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </SectionCard>
                      <InfoBanner
                        variant="success"
                        icon="shield"
                        message="This transfer uses SWIFT gpi for real-time tracking and enhanced security."
                      />
                    </>
                  )}

                  {transferType === 'ach' && (
                    <>
                      <SectionCard number={1} title="Transfer Details">
                        <InfoBanner
                          message="Standard ACH transfers typically take 1-3 business days to be delivered to the recipient's account."
                        />
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <FromAccountSelect
                            accounts={accountsList}
                            value={achForm.from_account_id}
                            onChange={(id) => {
                              setFromAccountId(id)
                              setAchForm((p) => ({ ...p, from_account_id: id }))
                            }}
                          />
                          <div>
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Recipient Name
                            </Label>
                            <Input
                              placeholder="Enter full name"
                              value={achForm.recipient_name}
                              onChange={(e) => setAchForm((p) => ({ ...p, recipient_name: e.target.value }))}
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Recipient Bank Name
                            </Label>
                            <Input
                              placeholder="Enter bank name"
                              value={achForm.bank_name}
                              onChange={(e) => setAchForm((p) => ({ ...p, bank_name: e.target.value }))}
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Account Type
                            </Label>
                            <Select
                              value={achForm.account_type}
                              onValueChange={(v: 'checking' | 'savings') => setAchForm((p) => ({ ...p, account_type: v }))}
                            >
                              <SelectTrigger className="mt-1.5 w-full" style={{ borderColor: colors.border }}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="checking">Checking</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <>
                            <div>
                              <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                                Recipient Routing Number (9 digits)
                              </Label>
                              <Input
                                placeholder="000000000"
                                maxLength={9}
                                value={achForm.routing_number}
                                onChange={async (e) => {
                                  const val = e.target.value.replace(/\D/g, '')
                                  setAchForm((p) => ({ ...p, routing_number: val }))
                                  setRoutingErrorMsg('')
                                  setRoutingValid(null)
                                  if (val.length === 9) {
                                    try {
                                      setRoutingChecking(true)
                                      const resp = await apiClient.get<{ valid: boolean; bank_name?: string }>(`/api/v1/transfers/validate-routing?number=${val}`)
                                      const isValid = !!resp?.valid
                                      setRoutingValid(isValid)
                                      if (isValid && resp.bank_name) {
                                        setAchForm((p) => ({ ...p, bank_name: resp.bank_name || p.bank_name }))
                                      }
                                      if (!isValid) setRoutingErrorMsg('Invalid routing number')
                                    } catch {
                                      setRoutingValid(false)
                                      setRoutingErrorMsg('Validation service unavailable')
                                    } finally {
                                      setRoutingChecking(false)
                                    }
                                  }
                                }}
                                className="mt-1.5"
                              />
                              {routingChecking && <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>Validating routing number…</p>}
                              {routingValid === false && <p className="mt-1 text-xs" style={{ color: colors.error }}>{routingErrorMsg || 'Invalid routing number'}</p>}
                              {routingValid && <p className="mt-1 text-xs" style={{ color: colors.success }}>Routing number recognized</p>}
                            </div>
                            <div>
                              <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                                Recipient Account Number
                              </Label>
                              <Input
                                placeholder="Enter account number"
                                value={achForm.account_number}
                                onChange={(e) => setAchForm((p) => ({ ...p, account_number: e.target.value }))}
                                className="mt-1.5"
                              />
                            </div>
                          </>
                          <div className="sm:col-span-2">
                            <AmountInput
                              label={`Amount (${currency})`}
                              value={achForm.amount}
                              onChange={(v) => setAchForm((p) => ({ ...p, amount: v }))}
                              currency={currency}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Description
                            </Label>
                            <Input
                              placeholder="e.g. Invoice AWS-INV-00912"
                              value={achForm.description || ''}
                              onChange={(e) => setAchForm((p) => ({ ...p, description: e.target.value }))}
                              className="mt-1.5"
                            />
                          </div>
                        </div>
                      </SectionCard>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Right: Summary - real-time */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <TransferSummaryCard
                  summary={summary}
                  onConfirm={handleReviewTransfer}
                  confirmLabel="Review Transfer"
                  disclaimer="Rates are subject to market volatility. Final conversion at execution. Fees may vary by destination."
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
        </>
      )}
      <ResetPinModal open={resetPinOpen} onOpenChange={setResetPinOpen} />
      <ReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        data={receiptData || { status: 'unknown', type: 'domestic', amount: 0, currency }}
      />

      {activeTab === 'history' && (
        <div className="space-y-4">
          {historyMetrics && <HistoryKpis metrics={historyMetrics} currency={currency} />}
          <HistoryFilters value={filters} onChange={(v) => { setFilters(v); setHistoryPage(1) }} />
          {loadingHistory ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : historyError ? (
            <p className="py-8 text-center text-sm" style={{ color: colors.error }}>
              {historyError}
            </p>
          ) : (
            <HistoryTable
              items={historyItems}
              page={historyPage}
              total={historyTotal}
              pageSize={historyPageSize}
              onPageChange={setHistoryPage}
            />
          )}
        </div>
      )}
    </div>
  )
}
