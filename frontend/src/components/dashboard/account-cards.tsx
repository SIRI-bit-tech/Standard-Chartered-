'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, Landmark, Wallet, Eye, EyeOff, Copy, Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useCryptoPrice } from '@/hooks/use-crypto-price'
import { Button } from '@/components/ui/button'
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { colors } from '@/types'
import type { Account } from '@/types'

const cardStyles: Record<string, { bg: string; label: string }> = {
  checking: { bg: '#E6F2FF', label: 'Checking' },
  savings: { bg: '#EEF9F3', label: 'Savings' },
  crypto: { bg: '#F3E8FF', label: 'Crypto' },
}

export function AccountCards({
  accounts,
  loading,
  primaryCurrency = 'USD',
}: {
  accounts: Account[]
  loading?: boolean
  primaryCurrency?: string
}) {
  const ordered = [...accounts].sort((a, b) => {
    const order: Record<string, number> = { checking: 0, savings: 1, crypto: 2 }
    return (order[a.type] ?? 99) - (order[b.type] ?? 99)
  })
  const startIndex = Math.max(
    0,
    ordered.findIndex((a) => a.type === 'checking'),
  )

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-xl"
            style={{ backgroundColor: colors.gray100 }}
          />
        ))}
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed py-12 text-center"
        style={{ borderColor: colors.border }}
      >
        <p className="text-sm" style={{ color: colors.textSecondary }}>
          No accounts yet. Your accounts will be opened through the standard banking process.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="sm:hidden">
        <Carousel
          opts={{ align: 'start', loop: false, dragFree: false, startIndex }}
          className="w-full"
        >
          <CarouselContent>
            {ordered.map((account) => (
              <CarouselItem key={account.id}>
                <div className="px-4">
                  <AccountCard account={account} primaryCurrency={primaryCurrency} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-4">
        {ordered.map((account) => (
          <AccountCard key={account.id} account={account} primaryCurrency={primaryCurrency} />
        ))}
      </div>
    </>
  )
}

function AccountCard({ account, primaryCurrency }: { account: Account; primaryCurrency: string }) {
  const [numberVisible, setNumberVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const style = cardStyles[account.type] || cardStyles.checking
  const Icon = account.type === 'checking' ? CreditCard : account.type === 'savings' ? Landmark : Wallet

  const { price: btcPrice } = useCryptoPrice('bitcoin')

  // For crypto, show wallet_id; for others, show account_number
  const isCrypto = account.type === 'crypto'
  const identifier = isCrypto
    ? account.wallet_id || ''
    : account.account_number
  const hasIdentifier = !!identifier
  const displayNumber = !hasIdentifier
    ? 'Pending setup'
    : numberVisible || isCrypto
      ? identifier
      : `**** ${identifier.slice(-4)}`

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
    <Link
      href={`/dashboard/accounts/${account.id}`}
      className="block w-full rounded-xl border p-6 transition-shadow hover:shadow-md"
      style={{ backgroundColor: style.bg, borderColor: colors.border }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase" style={{ color: colors.primary }}>
          {style.label} Account
        </span>
        <Icon className="h-5 w-5" style={{ color: colors.primary }} />
      </div>
      <p className="text-sm" style={{ color: colors.textSecondary }}>
        {account.nickname || 'Unnamed Account'}
      </p>
      <div className="mt-0.5 flex items-center gap-1 min-w-0">
        <p className={cn(
          "font-mono text-[10px] sm:text-xs text-gray-500",
          isCrypto ? "break-all" : "truncate"
        )}>
          {displayNumber}
        </p>
        <div className="flex shrink-0">
          {!isCrypto && hasIdentifier && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setNumberVisible((v) => !v)
              }}
              aria-label={numberVisible ? 'Hide account number' : 'Show account number'}
            >
              {numberVisible ? (
                <EyeOff className="h-3.5 w-3.5" style={{ color: colors.textSecondary }} />
              ) : (
                <Eye className="h-3.5 w-3.5" style={{ color: colors.textSecondary }} />
              )}
            </Button>
          )}
          {hasIdentifier && (isCrypto || numberVisible) && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
              aria-label="Copy identifier"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" style={{ color: colors.textSecondary }} />
              )}
            </Button>
          )}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xl font-bold" style={{ color: colors.primary }}>
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
    </Link>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}
