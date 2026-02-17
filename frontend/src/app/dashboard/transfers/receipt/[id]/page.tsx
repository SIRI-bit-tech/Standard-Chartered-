'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { colors, type TransferReceipt } from '@/types'

export default function TransferReceiptPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [data, setData] = useState<TransferReceipt | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await apiClient.get<{ success: boolean; data: TransferReceipt }>(`/api/v1/transfers/${id}`)
        if (!cancelled && res.success) setData(res.data)
      } catch (e) {
        if (!cancelled) setError('Unable to load receipt')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (id) load()
    return () => { cancelled = true }
  }, [id])

  const printPage = () => window.print()
  const amountText = useMemo(() => {
    if (!data) return ''
    const amt = Number(data.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `${data.currency} ${amt}`
  }, [data])
  const totalText = useMemo(() => {
    if (!data) return ''
    const amt = Number(data.total_amount || data.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `${data.currency} ${amt}`
  }, [data])

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-2xl border p-6 shadow-sm" style={{ borderColor: colors.border, background: colors.white }}>
        {loading ? (
          <p style={{ color: colors.textSecondary }}>Loading receipt…</p>
        ) : error ? (
          <p className="text-sm" style={{ color: colors.error }}>{error}</p>
        ) : data ? (
          <>
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: data.status === 'completed' ? `${colors.success}20` : colors.primaryLight }}>
                <span className="text-2xl" style={{ color: data.status === 'completed' ? colors.success : colors.primary }}>✓</span>
              </div>
              <h1 className="text-xl font-semibold" style={{ color: colors.textPrimary }}>
                {data.status === 'completed' ? 'Transfer Successful' : data.status === 'pending' || data.status === 'processing' ? 'Transfer Processing' : 'Transfer Status'}
              </h1>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Your transaction has been processed successfully.
              </p>
            </div>
            <div className="my-6 text-center">
              <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: colors.textSecondary }}>
                AMOUNT TRANSFERRED
              </p>
              <p className="mt-1 text-4xl font-extrabold" style={{ color: colors.primary }}>
                {amountText}
              </p>
            </div>
            <hr className="my-5" style={{ borderColor: colors.border }} />
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  Transaction Reference
                </p>
                <p className="mt-1 font-medium" style={{ color: colors.textPrimary }}>
                  {data.reference_number}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  Date & Time
                </p>
                <p className="mt-1 font-medium" style={{ color: colors.textPrimary }}>
                  {data.created_at ? new Date(data.created_at).toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  From Account
                </p>
                <p className="mt-1 font-medium" style={{ color: colors.textPrimary }}>
                  {data.from_account_masked || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  Recipient Bank
                </p>
                <p className="mt-1 font-medium" style={{ color: colors.textPrimary }}>
                  {data.recipient_bank || '—'}
                </p>
              </div>
              <div className="col-span-2 md:col-span-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  Recipient Name
                </p>
                <p className="mt-1 font-medium" style={{ color: colors.textPrimary }}>
                  {data.recipient_name || data.recipient_account_masked || '—'}
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-xl border p-4" style={{ borderColor: colors.border, backgroundColor: colors.gray50 }}>
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: colors.textPrimary }}>
                <span className="text-base">🧾</span> Transfer Summary
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span style={{ color: colors.textSecondary }}>Transfer Amount</span>
                  <span style={{ color: colors.textPrimary }}>{amountText}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: colors.textSecondary }}>Processing Fee</span>
                  <span style={{ color: colors.textPrimary }}>
                    {data.currency} {Number(data.fee_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <hr className="my-2" style={{ borderColor: colors.border }} />
                <div className="flex items-center justify-between font-semibold">
                  <span style={{ color: colors.textPrimary }}>Total Amount</span>
                  <span style={{ color: colors.primary }}>{totalText}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 text-[11px]" style={{ color: colors.textSecondary }}>This is a computer-generated receipt and requires no signature.</div>
          </>
        ) : null}
      </div>
      {data ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button variant="outline" onClick={printPage}>PDF</Button>
          <Button variant="outline" onClick={printPage}>Email</Button>
          <Button variant="outline" onClick={printPage}>Print</Button>
          <Button onClick={() => { window.location.href = '/dashboard/transfers' }}>+ New</Button>
        </div>
      ) : null}
    </div>
  )
}
