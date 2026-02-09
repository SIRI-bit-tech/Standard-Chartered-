'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, Landmark, Wallet, Eye, EyeOff } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
}: {
  accounts: Account[]
  loading?: boolean
}) {
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
          No accounts yet
        </p>
        <Link
          href="/dashboard/accounts"
          className="mt-2 inline-block text-sm font-medium"
          style={{ color: colors.primary }}
        >
          Create an account
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  )
}

function AccountCard({ account }: { account: Account }) {
  const [numberVisible, setNumberVisible] = useState(false)
  const style = cardStyles[account.type] || cardStyles.checking
  const Icon = account.type === 'checking' ? CreditCard : account.type === 'savings' ? Landmark : Wallet
  const displayNumber = numberVisible
    ? account.account_number
    : `**** ${account.account_number.slice(-4)}`

  return (
    <Link
      href={`/dashboard/accounts/${account.id}`}
      className="rounded-xl border p-6 transition-shadow hover:shadow-md"
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
      <div className="mt-0.5 flex items-center gap-1">
        <p className="font-mono text-xs" style={{ color: colors.textSecondary }}>
          {displayNumber}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
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
      </div>
      <p className="mt-3 text-xl font-bold" style={{ color: colors.primary }}>
        {formatCurrency(account.balance, account.currency)}
      </p>
    </Link>
  )
}
