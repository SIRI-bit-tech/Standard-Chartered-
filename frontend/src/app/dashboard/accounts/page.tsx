'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CreditCard, Landmark, Wallet, ArrowRightLeft, Eye, EyeOff, Download } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useAccountStore } from '@/lib/store'
import { formatCurrency, toTitleCase } from '@/lib/utils'
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
      `Total Net Worth: ${formatCurrency(totalNetWorth, user?.primary_currency ?? 'USD')}`,
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
        <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
          My Accounts
        </h1>
        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
          Manage your finances across all account types.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border p-6"
              style={{ borderColor: colors.border }}
            >
              <Skeleton className="mb-4 h-10 w-24" />
              <Skeleton className="mb-2 h-6 w-32" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
      ) : accounts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
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
          className="rounded-xl border p-6"
          style={{ borderColor: colors.border, backgroundColor: colors.gray50 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                Total Net Worth
              </p>
              <p className="text-2xl font-bold" style={{ color: colors.primary }}>
                {formatCurrency(totalNetWorth, user.primary_currency)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadStatement}
                className="gap-2"
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

function AccountCard({ account }: { account: Account }) {
  const [numberVisible, setNumberVisible] = useState(false)
  const style = CARD_STYLES[account.type] || CARD_STYLES.checking
  const Icon =
    account.type === 'checking'
      ? CreditCard
      : account.type === 'savings'
        ? Landmark
        : Wallet
  const displayNumber = numberVisible
    ? account.account_number
    : `**** ${account.account_number.slice(-4)}`
  const statusLabel =
    account.type === 'crypto' && account.status === 'active'
      ? 'TRADING'
      : account.status.toUpperCase()
  const balanceLabel =
    account.type === 'crypto' ? 'MARKET VALUE (USD)' : 'AVAILABLE BALANCE'
  const primaryAction =
    account.type === 'checking'
      ? 'Transfer'
      : account.type === 'savings'
        ? 'Deposit'
        : 'Buy/Sell'

  return (
    <div
      className="rounded-xl border p-6 transition-shadow hover:shadow-md"
      style={{ backgroundColor: style.bg, borderColor: colors.border }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: style.iconBg }}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: colors.textPrimary }}>
              {account.nickname || `${toTitleCase(account.type)} Account`}
            </h3>
            <div className="mt-0.5 flex items-center gap-1">
              <span className="font-mono text-xs" style={{ color: colors.textSecondary }}>
                {displayNumber}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
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
            </div>
          </div>
        </div>
        <span
          className="rounded px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor:
              account.type === 'crypto' ? colors.info + '20' : colors.success + '20',
            color: account.type === 'crypto' ? colors.info : colors.success,
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mb-6">
        <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>
          {balanceLabel}
        </p>
        <p className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          {formatCurrency(account.balance, account.currency)}
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link href={`/dashboard/accounts/${account.id}`}>View Details</Link>
        </Button>
        <Button size="sm" className="flex-1 gap-1" asChild>
          <Link
            href={
              account.type === 'checking'
                ? '/dashboard/transfers'
                : account.type === 'savings'
                  ? '/dashboard/deposits'
                  : '/dashboard/accounts/' + account.id
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
