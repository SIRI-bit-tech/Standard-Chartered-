import { colors, type TransferReceipt } from '@/types'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'

interface Props {
  open: boolean
  onClose: () => void
  data: { id?: string; status: string; type: string; amount: number; currency: string; reference?: string; created_at?: string; from_account_id?: string }
}

export function ReceiptModal({ open, onClose, data }: Props) {
  const [receipt, setReceipt] = useState<TransferReceipt | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!open) return
      if (!data?.id) {
        setReceipt(null)
        return
      }
      setLoading(true)
      setError('')
      try {
        const res = await apiClient.get<{ success: boolean; data: TransferReceipt }>(`/api/v1/transfers/${data.id}`)
        if (!cancelled && res.success) setReceipt(res.data)
      } catch {
        if (!cancelled) setError('Unable to load receipt')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, data?.id])

  const printReceipt = () => {
    window.print()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-[560px] rounded-2xl border bg-white p-6" style={{ borderColor: colors.border }}>
        {loading ? (
          <p className="text-sm" style={{ color: colors.textSecondary }}>Loading receipt…</p>
        ) : error ? (
          <p className="text-sm" style={{ color: colors.error }}>{error}</p>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${colors.success}20` }}>
                <span className="text-2xl font-bold" style={{ color: colors.success }}>✓</span>
              </div>
              <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                {data.status === 'completed' ? 'Transfer Successful' : data.status === 'processing' || data.status === 'pending' ? 'Transfer Processing' : 'Transfer Status'}
              </h2>
              <div className="text-center">
                <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: colors.textSecondary }}>
                  Amount Transferred
                </p>
                <p className="mt-1 text-3xl font-extrabold" style={{ color: colors.primary }}>
                  {formatCurrency(data.amount, data.currency)}
                </p>
              </div>
            </div>
            <hr className="my-4" style={{ borderColor: colors.border }} />
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  Transaction Reference
                </p>
                <p className="mt-1 font-medium" style={{ color: colors.textPrimary }}>
                  {receipt?.reference_number || data.reference || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  Date & Time
                </p>
                <p className="mt-1 font-medium" style={{ color: colors.textPrimary }}>
                  {receipt?.created_at ? new Date(receipt.created_at).toLocaleString() : (data.created_at ? new Date(data.created_at).toLocaleString() : '—')}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  From Account
                </p>
                <p className="mt-1 font-medium" style={{ color: colors.textPrimary }}>
                  {receipt?.from_account_masked || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  Recipient Bank
                </p>
                <p className="mt-1 font-medium" style={{ color: colors.textPrimary }}>
                  {receipt?.recipient_bank || '—'}
                </p>
              </div>
              <div className="col-span-2 md:col-span-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  Recipient Name
                </p>
                <p className="mt-1 font-medium" style={{ color: colors.textPrimary }}>
                  {receipt?.recipient_name || '—'}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border p-4" style={{ borderColor: colors.border, backgroundColor: '#F7F9FC' }}>
              <p className="mb-3 text-sm font-semibold" style={{ color: colors.textPrimary }}>Transfer Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span style={{ color: colors.textSecondary }}>Transfer Amount</span>
                  <span style={{ color: colors.textPrimary }}>
                    {formatCurrency(data.amount, data.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: colors.textSecondary }}>Processing Fee</span>
                  <span style={{ color: colors.textPrimary }}>
                    {receipt ? formatCurrency(receipt.fee_amount || 0, receipt.currency) : formatCurrency(0, data.currency)}
                  </span>
                </div>
                <hr className="my-2" style={{ borderColor: colors.border }} />
                <div className="flex items-center justify-between font-semibold">
                  <span style={{ color: colors.textPrimary }}>Total Amount</span>
                  <span style={{ color: colors.primary }}>
                    {receipt ? formatCurrency(receipt.total_amount || receipt.amount || 0, receipt.currency) : formatCurrency(data.amount, data.currency)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button variant="outline" onClick={printReceipt}>PDF</Button>
              <Button variant="outline" onClick={printReceipt}>Email</Button>
              <Button variant="outline" onClick={printReceipt}>Print</Button>
              {data.id ? (
                <Button onClick={() => { window.location.href = `/dashboard/transfers/receipt/${data.id}` }}>Open Full Receipt</Button>
              ) : (
                <Button onClick={onClose}>Close</Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
