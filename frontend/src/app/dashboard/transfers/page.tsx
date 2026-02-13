'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useAccountStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { COUNTRIES, TRANSFER_FEES } from '@/constants'
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
import { colors } from '@/types'
import type {
  Account,
  Transfer,
  TransferTypeTab,
  TransferSummaryState,
  InternalTransferForm,
  DomesticTransferForm,
  InternationalTransferForm,
  ACHTransferForm,
} from '@/types'

// Map tab to fee key
const FEE_KEYS: Record<TransferTypeTab, keyof typeof TRANSFER_FEES> = {
  internal: 'INTERNAL',
  domestic: 'DOMESTIC',
  international: 'INTERNATIONAL',
  ach: 'ACH',
}

// Estimated delivery copy per type
const ESTIMATED_DELIVERY: Record<TransferTypeTab, string> = {
  internal: 'Instant',
  domestic: '1-2 business days',
  international: '1-5 business days',
  ach: '1-3 business days',
}

// Interface for recipient search response
interface RecipientSearchResponse {
  success: boolean
  data: Array<{
    user_id: string
    display_name: string
    username: string
    email: string
    accounts: Array<{
      id: string
      type: string
      currency: string
      last_four: string
      is_primary: boolean
      status: string
    }>
  }>
  message: string
}

// Interface for recipient account (simplified version of Account)
interface RecipientAccount {
  id: string
  type: string
  currency: string
  last_four: string
  is_primary: boolean
  status: string
}

// Extended type for selected recipient with account selection
type SelectedRecipient = RecipientSearchResponse['data'][0] & {
  selectedAccount?: RecipientSearchResponse['data'][0]['accounts'][0] | null
}

export default function TransfersPage() {
  const { user } = useAuthStore()
  const { setAccounts } = useAccountStore()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')
  const [transferType, setTransferType] = useState<TransferTypeTab>('internal')
  
  // State for recipient search and selection
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RecipientSearchResponse['data']>([])
  const [selectedRecipient, setSelectedRecipient] = useState<SelectedRecipient | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Handler functions
  const handleRecipientSearch = async (query: string) => {
    if (!query.trim()) return
    
    setLoading(true)
    try {
      const response = await apiClient.get('/transfers/recipients/search', { params: { query } }) as { data: RecipientSearchResponse }
      setSearchResults(response.data.data || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to search recipients',
        variant: 'destructive'
      })
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }
  
  const selectRecipient = (recipient: RecipientSearchResponse['data'][0]) => {
    setSelectedRecipient(recipient as SelectedRecipient)
    setSearchQuery('')  // Clear search after selection
  }
  const [accountsList, setAccountsList] = useState<Account[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinError, setPinError] = useState('')
  const [transferError, setTransferError] = useState('')

  // Form state per type (single design: one active form at a time)
  const [internalForm, setInternalForm] = useState<InternalTransferForm>({
    from_account_id: '',
    to_account_id: '',
    amount: 0,
    reference_memo: '',
  })
  const [domesticForm, setDomesticForm] = useState<DomesticTransferForm>({
    from_account_id: '',
    recipient_name: '',
    routing_number: '',
    account_number: '',
    physical_address: '',
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
    routing_number: '',
    account_number: '',
    amount: 0,
    schedule: 'now',
  })

  // Load accounts and optionally hydrate account store
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id) return
      setLoadingAccounts(true)
      try {
        const res = await apiClient.get<{ success: boolean; data: Account[] }>(
          `/api/v1/accounts`,
        )
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
    apiClient
      .get<{ success: boolean; data: Transfer[] }>(`/api/v1/transfers/history?limit=50`)
      .then((res) => {
        if (cancelled) return
        if (res.success && Array.isArray(res.data)) setTransfers(res.data)
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
  }, [activeTab, user?.id])

  // Sync "from account" into each form when switching type
  const currentFromAccountId =
    transferType === 'internal'
      ? internalForm.from_account_id
      : transferType === 'domestic'
        ? domesticForm.from_account_id
        : transferType === 'international'
          ? internationalForm.from_account_id
          : achForm.from_account_id

  const setFromAccountId = (id: string) => {
    setInternalForm((p) => ({ ...p, from_account_id: id }))
    setDomesticForm((p) => ({ ...p, from_account_id: id }))
    setInternationalForm((p) => ({ ...p, from_account_id: id }))
    setAchForm((p) => ({ ...p, from_account_id: id }))
  }

  // Current amount and fee for summary (real-time)
  const amount =
    transferType === 'internal'
      ? internalForm.amount
      : transferType === 'domestic'
        ? domesticForm.amount
        : transferType === 'international'
          ? internationalForm.amount
          : achForm.amount
  const fee = TRANSFER_FEES[FEE_KEYS[transferType]] ?? 0
  const totalToPay = amount + fee
  const currency = user?.primary_currency ?? 'USD'

  const summary: TransferSummaryState = {
    amount,
    fee,
    totalToPay,
    estimatedDelivery: ESTIMATED_DELIVERY[transferType],
    currency,
  }

  const validateBeforeReview = (): string | null => {
    if (amount <= 0) return 'Enter a valid amount.'

    if (transferType === 'internal') {
      if (!internalForm.from_account_id) return 'Select a “From” account.'
      if (!internalForm.to_account_id) return 'Select a “To” account.'
      if (internalForm.from_account_id === internalForm.to_account_id)
        return 'From and To accounts must be different.'
      return null
    }

    if (transferType === 'domestic') {
      if (!domesticForm.from_account_id) return 'Select a “From” account.'
      if (!domesticForm.recipient_name.trim()) return 'Enter the recipient name.'
      if (!domesticForm.routing_number.trim()) return 'Enter a routing number.'
      if (!/^\d{9}$/.test(domesticForm.routing_number.trim()))
        return 'Routing number must be 9 digits.'
      if (!domesticForm.account_number.trim()) return 'Enter an account number.'
      if (!/^[0-9]{4,17}$/.test(domesticForm.account_number.trim()))
        return 'Account number must be 4-17 digits.'
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
    if (!achForm.routing_number.trim()) return 'Enter a routing number.'
    if (!/^\d{9}$/.test(achForm.routing_number.trim())) return 'Routing number must be 9 digits.'
    if (!achForm.account_number.trim()) return 'Enter an account number.'
    if (!/^[0-9]{4,17}$/.test(achForm.account_number.trim())) return 'Account number must be 4-17 digits.'
    return null
  }

  const confirmDisabled = validateBeforeReview() != null

  // Open PIN modal when user clicks Review/Confirm (no header/breadcrumb as per requirements)
  const handleReviewTransfer = () => {
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
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Invalid PIN'
      setPinError(typeof msg === 'string' ? msg : 'Invalid transfer PIN')
      setSubmitting(false)
      throw new Error('PIN verification failed')
    }

    try {
      if (transferType === 'internal') {
        const payload = {
          transfer_pin: pin,
          from_account_id: internalForm.from_account_id,
          to_account_id: internalForm.to_account_id,
          amount: internalForm.amount,
          description: internalForm.reference_memo || undefined,
        }
        const res = await apiClient.post<{ success: boolean; data?: { transfer_id: string; reference: string }; message?: string }>(
          '/api/v1/transfers/internal',
          payload,
        )
        if (res.success) {
          setInternalForm({ from_account_id: '', to_account_id: '', amount: 0, reference_memo: '' })
          alert(res.message ?? 'Transfer completed successfully.')
        }
      } else if (transferType === 'domestic') {
        // Validate recipient selection
        if (!selectedRecipient) {
          alert('Please select a recipient from the search results.')
          return
        }
        
        const payload = {
          transfer_pin: pin,
          from_account_id: domesticForm.from_account_id,
          recipient_id: selectedRecipient.user_id,
          to_account_id: selectedRecipient.selectedAccount?.id || selectedRecipient.accounts.find((acc) => acc.is_primary)?.id,
          amount: domesticForm.amount,
          description: domesticForm.memo || undefined,
        }
        const res = await apiClient.post<{ success: boolean; data?: { transfer_id: string; reference: string }; message?: string }>(
          '/api/v1/transfers/domestic',
          payload,
        )
        if (res.success) {
          setDomesticForm({
            from_account_id: '',
            recipient_name: '',
            routing_number: '',
            account_number: '',
            physical_address: '',
            amount: 0,
            memo: '',
          })
          setSelectedRecipient(null)
          alert(res.message ?? 'Domestic transfer submitted.')
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
          alert(res.message ?? 'International transfer submitted.')
        }
      } else {
        const payload = {
          transfer_pin: pin,
          from_account_id: achForm.from_account_id,
          routing_number: achForm.routing_number,
          account_number: achForm.account_number,
          account_holder: achForm.recipient_name,
          amount: achForm.amount,
          description: undefined,
        }
        const res = await apiClient.post<{ success: boolean; transfer_id?: string; message?: string }>(
          '/api/v1/transfers/ach',
          payload,
        )
        if (res.success) {
          setAchForm({
            from_account_id: '',
            recipient_name: '',
            account_type: 'checking',
            routing_number: '',
            account_number: '',
            amount: 0,
            schedule: 'now',
          })
          alert(res.message ?? 'ACH transfer submitted.')
        }
      }
    } catch (err) {
      console.error('Transfer failed:', err)
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setTransferError(detail ?? 'Transfer failed. Please try again.')
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  const ownAccountsExcludingFrom = accountsList.filter((a) => a.id !== currentFromAccountId)

  return (
    <div className="space-y-6">
      {/* Page title - no breadcrumb, no header per requirements */}
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: colors.textPrimary }}>
          Move Money
        </h1>
        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
          Transfer between your accounts or to other recipients.
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
                  {transferType === 'internal' && (
                    <>
                      <SectionCard number={1} title="Sender Information">
                        <FromAccountSelect
                          accounts={accountsList}
                          value={internalForm.from_account_id}
                          onChange={(id) => {
                            setFromAccountId(id)
                            setInternalForm((p) => ({ ...p, from_account_id: id }))
                          }}
                        />
                      </SectionCard>
                      <SectionCard number={2} title="Recipient & Amount">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              To Account
                            </Label>
                            <Select
                              value={internalForm.to_account_id}
                              onValueChange={(v) => setInternalForm((p) => ({ ...p, to_account_id: v }))}
                            >
                              <SelectTrigger className="w-full mt-1.5" style={{ borderColor: colors.border }}>
                                <SelectValue placeholder="Select destination account" />
                              </SelectTrigger>
                              <SelectContent>
                                {ownAccountsExcludingFrom.map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id}>
                                    {acc.nickname || acc.type} - ****{acc.account_number.slice(-4)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <AmountInput
                            value={internalForm.amount}
                            onChange={(v) => setInternalForm((p) => ({ ...p, amount: v }))}
                            currency={currency}
                          />
                          <div>
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Reference / Memo
                            </Label>
                            <Input
                              placeholder="e.g. Rent Payment"
                              value={internalForm.reference_memo}
                              onChange={(e) => setInternalForm((p) => ({ ...p, reference_memo: e.target.value }))}
                              className="mt-1.5"
                            />
                          </div>
                        </div>
                      </SectionCard>
                      <InfoBanner
                        variant="success"
                        icon="zap"
                        message="Instant Transfer Eligible — Funds will be available immediately in the recipient account."
                      />
                    </>
                  )}

                  {transferType === 'domestic' && (
                    <>
                      <SectionCard number={1} title="Funding Account">
                        <FromAccountSelect
                          accounts={accountsList}
                          value={domesticForm.from_account_id}
                          onChange={(id) => {
                            setFromAccountId(id)
                            setDomesticForm((p) => ({ ...p, from_account_id: id }))
                          }}
                        />
                      </SectionCard>
                      <SectionCard number={2} title="Recipient Information">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Recipient Search
                            </Label>
                            <div className="relative">
                              <Input
                                placeholder="Search by name..."
                                value={searchQuery}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  setSearchQuery(e.target.value)
                                  if (e.target.value.length >= 2) {
                                    handleRecipientSearch(e.target.value)
                                  } else {
                                    setSearchResults([])
                                  }
                                }}
                                className="mt-1.5"
                                disabled={loading}
                              />
                              {loading && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                </div>
                              )}
                              {searchResults.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  {searchResults.map((recipient) => (
                                    <div
                                      key={recipient.user_id}
                                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                      onClick={() => selectRecipient(recipient)}
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="font-medium text-sm" style={{ color: colors.textPrimary }}>
                                            {recipient.display_name}
                                          </div>
                                          <div className="text-xs" style={{ color: colors.textSecondary }}>
                                            {recipient.email}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-xs text-gray-500">
                                            {recipient.accounts.map((account) => (
                                              <div key={account.id} className="flex items-center gap-1 text-xs">
                                                <span className="font-medium">{account.type}</span>
                                                <span>•••• {account.last_four}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {selectedRecipient ? (
                            <div className="sm:col-span-2">
                              <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                                Selected Recipient
                              </Label>
                              <div className="p-3 bg-gray-50 rounded-lg border">
                                <div className="font-medium text-sm" style={{ color: colors.textPrimary }}>
                                  {selectedRecipient.display_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {selectedRecipient.email}
                                </div>
                                <div className="mt-2">
                                  <Label className="text-xs">Select Account</Label>
                                  <select
                                    value={selectedRecipient.accounts.find((acc) => acc.is_primary)?.id || ''}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                  if (selectedRecipient) {
                                    setSelectedRecipient({
                                      ...selectedRecipient,
                                      selectedAccount: selectedRecipient.accounts.find(acc => acc.id === e.target.value) || null
                                    })
                                  }
                                }}
                                    className="mt-1 w-full p-2 border rounded"
                                  >
                                    {selectedRecipient.accounts.map((account: RecipientAccount) => (
                                      <option key={account.id} value={account.id}>
                                        {account.type} (••• {account.last_four})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </SectionCard>
                      <SectionCard number={3} title="Transfer Amount">
                        <div className="space-y-4">
                          <AmountInput
                            label="Amount (USD)"
                            value={domesticForm.amount}
                            onChange={(v) => setDomesticForm((p) => ({ ...p, amount: v }))}
                            currency={currency}
                          />
                          <div>
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Memo (Optional)
                            </Label>
                            <Input
                              placeholder="Reference for recipient"
                              value={domesticForm.memo}
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
                            <Select
                              value={internationalForm.country}
                              onValueChange={(v) => setInternationalForm((p) => ({ ...p, country: v }))}
                            >
                              <SelectTrigger className="mt-1.5 w-full" style={{ borderColor: colors.border }}>
                                <SelectValue placeholder="Select destination country" />
                              </SelectTrigger>
                              <SelectContent>
                                {COUNTRIES.map((c) => (
                                  <SelectItem key={c.code} value={c.code}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                            label="Amount to Send"
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
                          {user?.country === 'US' && (
                            <>
                              <div>
                                <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                                  Recipient Routing Number (9 digits)
                                </Label>
                                <Input
                                  placeholder="000000000"
                                  maxLength={9}
                                  value={achForm.routing_number}
                                  onChange={(e) => setAchForm((p) => ({ ...p, routing_number: e.target.value.replace(/\D/g, '') }))}
                                  className="mt-1.5"
                                />
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
                          )}
                          <div className="sm:col-span-2">
                            <AmountInput
                              value={achForm.amount}
                              onChange={(v) => setAchForm((p) => ({ ...p, amount: v }))}
                              currency={currency}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              Schedule Transfer
                            </Label>
                            <div className="mt-1.5 flex gap-2">
                              <button
                                type="button"
                                onClick={() => setAchForm((p) => ({ ...p, schedule: 'now' }))}
                                className="rounded-lg border px-3 py-2 text-sm font-medium"
                                style={{
                                  borderColor: achForm.schedule === 'now' ? colors.primary : colors.border,
                                  color: achForm.schedule === 'now' ? colors.primary : colors.textSecondary,
                                }}
                              >
                                Now
                              </button>
                              <button
                                type="button"
                                onClick={() => setAchForm((p) => ({ ...p, schedule: 'future' }))}
                                className="rounded-lg border px-3 py-2 text-sm font-medium"
                                style={{
                                  borderColor: achForm.schedule === 'future' ? colors.primary : colors.border,
                                  color: achForm.schedule === 'future' ? colors.primary : colors.textSecondary,
                                }}
                              >
                                Future Date
                              </button>
                            </div>
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
                  confirmLabel={transferType === 'internal' ? 'Confirm Transfer' : 'Review Transfer'}
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
          />
        </>
      )}

      {activeTab === 'history' && (
        <div className="rounded-xl border p-6" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
          <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
            Recent Transfers
          </h2>
          <div className="mt-4 space-y-3">
            {loadingHistory ? (
              [1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))
            ) : historyError ? (
              <p className="py-8 text-center text-sm" style={{ color: colors.error }}>
                {historyError}
              </p>
            ) : transfers.length > 0 ? (
              transfers.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
                  style={{ borderColor: colors.border }}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl" style={{ color: colors.primary }}>↔</span>
                    <div>
                      <p className="font-medium" style={{ color: colors.textPrimary }}>
                        {t.description ?? `${t.type} transfer`}
                      </p>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>
                        {formatDate(t.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: colors.textPrimary }}>
                      {formatCurrency(t.amount, t.currency)}
                    </p>
                    <p
                      className="text-xs font-medium"
                      style={{
                        color: t.status === 'completed' ? colors.success : t.status === 'pending' ? colors.warning : colors.textSecondary,
                      }}
                    >
                      {String(t.status).toUpperCase()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm" style={{ color: colors.textSecondary }}>
                No transfers yet.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
