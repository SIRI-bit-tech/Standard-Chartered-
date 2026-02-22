'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CreditCard, Landmark, Wallet, ArrowRightLeft, Eye, EyeOff, Download, Copy, Check } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useAccountStore } from '@/lib/store'
import { formatCurrency, cn, toTitleCase, getCurrencyFromCountry } from '@/lib/utils'
import { useCryptoPrice } from '@/hooks/use-crypto-price'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { colors } from '@/types'
import type { Account } from '@/types'

const CARD_STYLES: Record<string, { bg: string; iconBg: string }> = {
  checking: { bg: '#E6F2FF', iconBg: '#0066CC' },
  savings: { bg: '#FFF4E6', iconBg: '#E65100' },
  crypto: { bg: '#F3E8FF', iconBg: '#7C3AED' },
}

export default function AccountsPage() {
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const { accounts, setAccounts } = useAccountStore()

  useEffect(() => {
    if (user) loadAccounts()
  }, [user])

  const loadAccounts = async () => {
    if (!user) return
    try {
      const res = await apiClient.get<{ success: boolean; data: Account[] }>(
        `/api/v1/accounts`,
      )
      if (res.success && res.data) setAccounts(res.data)
    } catch (e) {
      console.error('Failed to load accounts:', e)
    } finally {
      setLoading(false)
    }
  }

  const primaryAccount = accounts.find((a) => a.is_primary) ?? accounts[0]
  const primaryCurrency = user?.primary_currency && user?.primary_currency !== 'USD'
    ? user?.primary_currency
    : (primaryAccount?.currency || getCurrencyFromCountry(user?.country))

  const totalNetWorth = accounts.reduce((sum, a) => sum + a.balance, 0)

  const handleDownloadStatement = async () => {
    const now = new Date()
    const month = now.toLocaleString('default', { month: 'long' })
    const year = now.getFullYear()
    const lines = [
      `Account Statement - ${month} ${year}`,
      `Generated: ${now.toISOString().slice(0, 10)}`,
      '',
      'Account Summary',
      '---',
      ...accounts.map(
        (a) =>
          `${a.nickname || toTitleCase(a.type)} (****${a.account_number.slice(-4)}): ${formatCurrency(a.balance, a.currency)}`,
      ),
      '',
      `Total Net Worth: ${formatCurrency(totalNetWorth, primaryCurrency)}`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statement-${year}-${String(now.getMonth() + 1).padStart(2, '0')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: colors.textPrimary }}>
          My Accounts
        </h1>
        <p className="mt-1 text-xs sm:text-sm" style={{ color: colors.textSecondary }}>
          Manage your finances across all account types.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border p-4 sm:p-6"
              style={{ borderColor: colors.border }}
            >
              <Skeleton className="mb-4 h-10 w-24" />
              <Skeleton className="mb-2 h-6 w-32" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
      ) : accounts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} primaryCurrency={primaryCurrency} />
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl border border-dashed py-12 text-center"
          style={{ borderColor: colors.border }}
        >
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            No accounts to display.
          </p>
        </div>
      )}

      {!loading && accounts.length > 0 && (
        <div
          className="rounded-xl border p-4 sm:p-6"
          style={{ borderColor: colors.border, backgroundColor: colors.gray50 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs sm:text-sm font-medium" style={{ color: colors.textSecondary }}>
                Total Net Worth
              </p>
              <p className="text-xl sm:text-2xl font-bold" style={{ color: colors.primary }}>
                {formatCurrency(totalNetWorth, primaryCurrency)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadStatement}
                className="flex-1 sm:flex-none gap-2"
              >
                <Download className="h-4 w-4" />
                Statement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AccountCard({ account, primaryCurrency }: { account: Account; primaryCurrency: string }) {
  const [numberVisible, setNumberVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const style = CARD_STYLES[account.type] || CARD_STYLES.checking
  const Icon =
    account.type === 'checking'
      ? CreditCard
      : account.type === 'savings'
        ? Landmark
        : Wallet

  const { price: btcPrice } = useCryptoPrice('bitcoin')

  const isCrypto = account.type === 'crypto'
  const isFrozen = account.status === 'frozen'
  const identifier = isCrypto
    ? account.wallet_id || ''
    : account.account_number
  const hasIdentifier = !!identifier
  const displayNumber = !hasIdentifier
    ? 'Pending setup'
    : numberVisible || isCrypto
      ? identifier
      : isCrypto
        ? `${identifier.substring(0, 8)}...${identifier.slice(-6)}`
        : `**** ${identifier.slice(-4)}`

  const statusLabel = isCrypto && account.status === 'active' ? 'TRADING' : account.status.toUpperCase()
  const balanceLabel =
    isCrypto ? 'MARKET VALUE (BTC)' : 'AVAILABLE BALANCE'

  const primaryAction = isCrypto ? 'Withdraw' : 'Transfer'

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!identifier) return
    navigator.clipboard.writeText(identifier)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const btcValue = isCrypto ? account.balance : 0
  const usdValue = isCrypto && btcPrice ? account.balance * btcPrice : account.balance

  return (
    <div
      className="rounded-xl border p-4 sm:p-6 transition-shadow hover:shadow-md h-full flex flex-col"
      style={{ backgroundColor: style.bg, borderColor: colors.border }}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: style.iconBg }}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate text-sm sm:text-base" style={{ color: colors.textPrimary }}>
              {account.nickname || `${toTitleCase(account.type)} Account`}
            </h3>
            <div className="mt-0.5 flex items-center gap-1 min-w-0">
              <span className={cn(
                "font-mono text-[10px] sm:text-xs",
                isCrypto ? "break-all text-gray-500" : "truncate text-gray-400"
              )} style={{ color: isCrypto ? undefined : colors.textSecondary }}>
                {displayNumber}
              </span>
              <div className="flex shrink-0">
                {!isCrypto && hasIdentifier && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.preventDefault()
                      setNumberVisible((v) => !v)
                    }}
                    aria-label={numberVisible ? 'Hide number' : 'Show number'}
                  >
                    {numberVisible ? (
                      <EyeOff className="h-3 w-3" style={{ color: colors.textSecondary }} />
                    ) : (
                      <Eye className="h-3 w-3" style={{ color: colors.textSecondary }} />
                    )}
                  </Button>
                )}
                {hasIdentifier && (isCrypto || numberVisible) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCopy}
                    aria-label="Copy"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" style={{ color: colors.textSecondary }} />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        <span
          className="rounded px-2 py-0.5 text-[10px] font-bold uppercase transition-all"
          style={{
            backgroundColor: isCrypto ? `${colors.success}15` : isFrozen ? `${colors.error}15` : `${colors.success}15`,
            color: isCrypto ? colors.success : isFrozen ? colors.error : colors.success,
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mb-6 flex-1">
        <p className="text-[10px] sm:text-xs font-medium" style={{ color: colors.textSecondary }}>
          {balanceLabel}
        </p>
        <div className="mt-1">
          <p className="text-lg sm:text-xl font-bold" style={{ color: colors.textPrimary }}>
            {isCrypto ? (
              <span className="flex items-baseline gap-1">
                {btcValue.toFixed(8)} <span className="text-xs font-semibold">BTC</span>
              </span>
            ) : (
              formatCurrency(account.balance, account.currency)
            )}
          </p>
          {isCrypto && (
            <p className="text-[10px] mt-0.5 font-medium" style={{ color: colors.textSecondary }}>
              ≈ {formatCurrency(usdValue, primaryCurrency)}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-auto">
        <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
          <Link href={`/dashboard/accounts/${account.id}`}>View Details</Link>
        </Button>
        <Button size="sm" className="flex-1 gap-1 text-xs" asChild>
          <Link
            href={
              isCrypto
                ? `/dashboard/accounts/${account.id}?action=withdraw`
                : '/dashboard/transfers'
            }
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {primaryAction}
          </Link>
        </Button>
      </div>
    </div>
  )
}

