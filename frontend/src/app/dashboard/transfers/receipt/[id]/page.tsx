'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { colors, type TransferReceipt } from '@/types'
import Image from 'next/image'

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
    <>
      <style jsx global>{`
        @media print {
          /* Hide everything except the receipt */
          body > *:not(#__next) {
            display: none !important;
          }
          
          /* Hide navigation, header, and buttons */
          nav, header, .no-print, button {
            display: none !important;
          }
          
          /* Show only the receipt content */
          .print-only {
            display: block !important;
          }
          
          /* Remove padding and center content */
          body {
            margin: 0;
            padding: 20px;
          }
          
          /* Ensure receipt takes full width */
          .receipt-container {
            max-width: 100% !important;
            margin: 0 auto;
            box-shadow: none !important;
          }
        }
        
        .print-only {
          display: none;
        }
      `}</style>
      
      <div className="mx-auto max-w-lg p-4 sm:p-6">
        {/* Logo - only visible when printing */}
        <div className="print-only text-center mb-8">
          <Image 
            src="/logo.png" 
            alt="Standard Chartered" 
            width={200} 
            height={60}
            className="mx-auto"
            priority
          />
          <h1 className="text-2xl font-bold mt-4" style={{ color: colors.primary }}>
            Transfer Receipt
          </h1>
        </div>

        <div className="receipt-container rounded-2xl border p-6 shadow-sm" style={{ borderColor: colors.border, background: colors.white }}>
        {loading ? (
          <p style={{ color: colors.textSecondary }}>Loading receipt…</p>
        ) : error ? (
          <p className="text-sm" style={{ color: colors.error }}>{error}</p>
        ) : data ? (
          <>
            <div className="flex flex-col items-center gap-1.5 py-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: data.status === 'completed' ? `${colors.success}15` : colors.primaryLight }}>
                <span className="text-xl" style={{ color: data.status === 'completed' ? colors.success : colors.primary }}>✓</span>
              </div>
              <h1 className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                {data.status === 'completed' ? 'Transfer Successful' : data.status === 'pending' || data.status === 'processing' ? 'Transfer Processing' : 'Transfer Status'}
              </h1>
              <p className="text-xs opacity-75" style={{ color: colors.textSecondary }}>
                Your transaction has been processed successfully.
              </p>
            </div>
            <div className="my-4 text-center">
              <p className="text-[10px] font-bold tracking-widest uppercase opacity-70" style={{ color: colors.textSecondary }}>
                AMOUNT TRANSFERRED
              </p>
              <p className="mt-0.5 text-3xl font-black" style={{ color: colors.primary }}>
                {amountText}
              </p>
            </div>
            <hr className="my-5" style={{ borderColor: colors.border }} />
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: colors.textSecondary }}>
                  Ref. Number
                </p>
                <p className="mt-0.5 font-semibold truncate" style={{ color: colors.textPrimary }}>
                  {data.reference_number}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: colors.textSecondary }}>
                  Date & Time
                </p>
                <p className="mt-0.5 font-semibold" style={{ color: colors.textPrimary }}>
                  {data.created_at ? new Date(data.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: colors.textSecondary }}>
                  From Account
                </p>
                <p className="mt-0.5 font-semibold truncate" style={{ color: colors.textPrimary }}>
                  {data.from_account_masked || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: colors.textSecondary }}>
                  Recipient Bank
                </p>
                <p className="mt-0.5 font-semibold truncate" style={{ color: colors.textPrimary }}>
                  {data.recipient_bank || '—'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: colors.textSecondary }}>
                  Recipient Name
                </p>
                <p className="mt-0.5 font-semibold" style={{ color: colors.textPrimary }}>
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
          <div className="no-print mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button variant="outline" onClick={printPage}>PDF</Button>
            <Button variant="outline" onClick={printPage}>Email</Button>
            <Button variant="outline" onClick={printPage}>Print</Button>
            <Button onClick={() => { window.location.href = '/dashboard/transfers' }}>+ New</Button>
          </div>
        ) : null}
      </div>
    </>
  )
}
