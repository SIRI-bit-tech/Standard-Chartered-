'use client'

import { useState } from 'react'
import { Copy, Check, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { colors } from '@/types'
import type { Account } from '@/types'

interface AccountSummaryCardProps {
  loading: boolean
  totalBalance: number
  primaryCurrency: string
  primaryAccount: Account | undefined
  isUS: boolean
}

function CopyButton({
  copyValue,
  displayValue,
  label,
}: {
  copyValue: string
  displayValue: string
  label: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!copyValue) return
    await navigator.clipboard.writeText(copyValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!copyValue) return null

  return (
    <div className="flex items-center gap-2">
      <div>
        <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>{label}</p>
        <p className="font-mono text-sm font-semibold" style={{ color: colors.textPrimary }}>{displayValue}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handleCopy}
        aria-label={`Copy ${label}`}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" style={{ color: colors.textSecondary }} />
        )}
      </Button>
    </div>
  )
}

function AccountNumberWithVisibility({
  fullNumber,
  label,
}: {
  fullNumber: string
  label: string
}) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const displayValue = visible ? fullNumber : (fullNumber ? `**** ${fullNumber.slice(-4)}` : '')

  const handleCopy = async () => {
    if (!fullNumber) return
    await navigator.clipboard.writeText(fullNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!fullNumber) return null

  return (
    <div className="flex items-center gap-2">
      <div>
        <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>{label}</p>
        <p className="font-mono text-sm font-semibold" style={{ color: colors.textPrimary }}>{displayValue}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide account number' : 'Show account number'}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" style={{ color: colors.textSecondary }} />
        ) : (
          <Eye className="h-4 w-4" style={{ color: colors.textSecondary }} />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handleCopy}
        aria-label={`Copy ${label}`}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" style={{ color: colors.textSecondary }} />
        )}
      </Button>
    </div>
  )
}

export function AccountSummaryCard({
  loading,
  totalBalance,
  primaryCurrency,
  primaryAccount,
  isUS,
}: AccountSummaryCardProps) {
  const accountNumberFull = primaryAccount?.account_number ?? ''
  const routingNumber = primaryAccount?.routing_number ?? ''

  return (
    <div
      className="mt-4 flex flex-wrap items-start gap-6 rounded-lg border p-4"
      style={{ borderColor: colors.border }}
    >
      <div>
        <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>
          Total balance
        </p>
        <p className="text-xl font-bold" style={{ color: colors.primary }}>
          {loading ? '—' : formatCurrency(totalBalance, primaryCurrency)}
        </p>
      </div>
      {primaryAccount && (
        <>
          <AccountNumberWithVisibility
            fullNumber={accountNumberFull}
            label="Account number"
          />
          {isUS && (
            routingNumber ? (
              <CopyButton
                copyValue={routingNumber}
                displayValue={routingNumber}
                label="Routing number"
              />
            ) : (
              <div>
                <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>Routing number</p>
                <p className="font-mono text-sm font-semibold" style={{ color: colors.textPrimary }}>—</p>
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
