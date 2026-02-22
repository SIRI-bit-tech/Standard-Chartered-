'use client'

import { colors } from '@/types'
import { formatCurrency } from '@/lib/utils'
import type { Account } from '@/types'
import { useCryptoPrice } from '@/hooks/use-crypto-price'
import { Button } from '@/components/ui/button'
import { Copy, Check, QrCode } from 'lucide-react'
import { useState } from 'react'

function getStatusLabel(status: Account['status']) {
  switch (status) {
    case 'active':
      return 'Active'
    case 'frozen':
      return 'Frozen'
    case 'closed':
      return 'Closed'
    case 'pending':
      return 'Pending'
    default:
      return 'Unknown'
  }
}

function getStatusColor(status: Account['status']) {
  switch (status) {
    case 'active':
      return colors.success
    case 'pending':
      return colors.warning
    case 'frozen':
      return colors.error
    case 'closed':
      return colors.textSecondary
    default:
      return colors.textSecondary
  }
}

export interface AccountBalanceCardProps {
  availableBalance: number
  currency: string
  status: Account['status']
  type?: Account['type']
  wallet_id?: string | null
  wallet_qrcode?: string | null
  onWithdraw?: () => void
}

export function AccountBalanceCard({ availableBalance, currency, status, type, wallet_id, wallet_qrcode, onWithdraw }: AccountBalanceCardProps) {
  const [copied, setCopied] = useState(false)
  const isCrypto = type === 'crypto'
  const { price: btcPrice } = useCryptoPrice('bitcoin')

  const btcValue = isCrypto ? availableBalance : 0
  const usdValue = isCrypto && btcPrice ? availableBalance * btcPrice : availableBalance

  const handleCopy = () => {
    if (!wallet_id) return
    navigator.clipboard.writeText(wallet_id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const qrImageUrl = wallet_qrcode || (wallet_id ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${wallet_id}` : null)

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1 rounded-xl border p-6 flex flex-col justify-center" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
        <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
          {isCrypto ? 'Market Value (BTC)' : 'Available Balance'}
        </p>
        <p className="mt-1 text-3xl font-bold" style={{ color: colors.primary }}>
          {isCrypto ? (
            <span className="flex items-baseline gap-2">
              {btcValue.toFixed(8)} <span className="text-sm font-semibold">BTC</span>
            </span>
          ) : (
            formatCurrency(availableBalance, currency)
          )}
        </p>
        {isCrypto && (
          <div className="mt-2 flex flex-col gap-1">
            <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
              ≈ {formatCurrency(usdValue, 'USD')}
            </p>
            <p className="text-[10px]" style={{ color: colors.textSecondary }}>
              1 BTC = {formatCurrency(btcPrice || 0, 'USD')} (Live Rate)
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
          <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: getStatusColor(status) }} />
          <span className="font-medium uppercase">
            {isCrypto && status === 'active' ? 'Active' : getStatusLabel(status)} Account
          </span>
          <span>•</span>
          <span className="font-medium">{currency}</span>
        </div>

        {isCrypto && onWithdraw && (
          <div className="mt-4">
            <Button
              onClick={onWithdraw}
              className="w-full md:w-auto font-bold"
              style={{ backgroundColor: colors.primary }}
            >
              Withdraw BTC
            </Button>
          </div>
        )}

        {isCrypto && wallet_id && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Your Wallet ID</p>
            <div className="flex items-center justify-between gap-2 overflow-hidden">
              <p className="font-mono text-xs text-gray-600 break-all select-all">
                {wallet_id}
              </p>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-400" />}
              </Button>
            </div>
          </div>
        )}
      </div>

      {isCrypto && wallet_id && (
        <div className="w-full md:w-auto shrink-0 rounded-xl border p-6 flex flex-col items-center justify-center gap-4" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Wallet Address QR</p>
          <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
            {qrImageUrl ? (
              <img src={qrImageUrl} alt="Wallet QR" className="w-32 h-32 sm:w-40 sm:h-40" />
            ) : (
              <div className="w-40 h-40 flex items-center justify-center bg-gray-100 rounded">
                <QrCode className="w-12 h-12 text-gray-300" />
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-400 text-center max-w-[160px]">
            Scan this QR code to deposit BTC directly into your wallet.
          </p>
        </div>
      )}
    </div>
  )
}

