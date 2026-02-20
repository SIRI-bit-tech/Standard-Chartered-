'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useAccountStore } from '@/lib/store'
import { PayeesGrid } from '@/components/bills/payees-grid'
import { BillPaymentForm } from '@/components/bills/bill-payment-form'
import { BillsRecentHistory } from '@/components/bills/bills-recent-history'
import { SecurityTipCard } from '@/components/bills/security-tip-card'

export default function BillsPage() {
  const [loading, setLoading] = useState(true)
  const [payees, setPayees] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const { user } = useAuthStore()
  const { accounts, setAccounts } = useAccountStore()

  const load = async () => {
    if (!user) return
    try {
      const [pRes, hRes, aRes] = await Promise.all([
        apiClient.get('/api/v1/bills/payees'),
        apiClient.get('/api/v1/bills/history?limit=10'),
        apiClient.get('/api/v1/accounts'),
      ])
      if ((pRes as any).success) setPayees((pRes as any).data || [])
      if ((hRes as any).success) setHistory((hRes as any).data || [])
      if ((aRes as any).success && Array.isArray((aRes as any).data)) setAccounts((aRes as any).data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [user])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Bills</h1>
      {loading ? (
        <div className="py-12 text-center">Loading…</div>
      ) : (
        <>
          <PayeesGrid
            items={payees}
            onDeleted={async (id) => {
              setPayees((prev) => prev.filter((p) => p.id !== id))
              await load()
            }}
          />
          <BillPaymentForm
            payees={payees}
            accounts={accounts}
            onSuccess={async () => { await load() }}
          />
          <BillsRecentHistory items={history} />
          <SecurityTipCard />
        </>
      )}
    </div>
  )
}
