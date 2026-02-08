'use client'

import React from "react"

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useAccountStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TRANSFER_FEES } from '@/constants'
import { Skeleton } from '@/components/ui/skeleton'
import type { Transfer } from '@/types'

export default function TransfersPage() {
  const [activeTab, setActiveTab] = useState('new')
  const [transfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    from_account_id: '',
    transfer_type: 'internal',
    recipient: '',
    amount: 0 as number,
    description: '',
  })
  const { user } = useAuthStore()
  const { accounts } = useAccountStore()

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const endpoint =
        formData.transfer_type === 'internal'
          ? '/api/v1/transfers/internal'
          : formData.transfer_type === 'domestic'
            ? '/api/v1/transfers/domestic'
            : '/api/v1/transfers/international'

      const response = await apiClient.post<{ success: boolean; data: any }>(endpoint, {
        from_account_id: formData.from_account_id,
        to_account_id: formData.transfer_type === 'internal' ? formData.recipient : undefined,
        to_account_number: formData.transfer_type === 'domestic' ? formData.recipient : undefined,
        to_beneficiary_id: formData.transfer_type === 'international' ? formData.recipient : undefined,
        amount: formData.amount,
        description: formData.description,
      })

      if (response && typeof response === 'object' && 'success' in response && response.success) {
        alert('Transfer submitted successfully!')
        setFormData({
          from_account_id: '',
          transfer_type: 'internal',
          recipient: '',
          amount: 0,
          description: '',
        })
      }
    } catch (error) {
      console.error('Transfer failed:', error)
      alert('Transfer failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const feeKey = formData.transfer_type.toUpperCase() as keyof typeof TRANSFER_FEES
  const fee = TRANSFER_FEES[feeKey] || 0
  const total = (formData.amount || 0) + fee

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Money Transfer</h1>

      {/* Tabs */}
      <div className="bg-white border-b border-border rounded-t-xl">
        <div className="flex gap-8 px-6 py-4">
          <button
            onClick={() => setActiveTab('new')}
            className={`py-2 font-medium transition ${
              activeTab === 'new'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            New Transfer
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 font-medium transition ${
              activeTab === 'history'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Transfer History
          </button>
        </div>
      </div>

      {/* New Transfer Tab */}
      {activeTab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl p-8 border border-border">
            <form onSubmit={handleTransfer} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Transfer Type
                </label>
                <select
                  value={formData.transfer_type}
                  onChange={(e) => setFormData({ ...formData, transfer_type: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="internal">Internal (Own Accounts)</option>
                  <option value="domestic">Domestic (Other SC Accounts)</option>
                  <option value="international">International (Wire)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Fee: {formatCurrency(fee, 'USD')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  From Account
                </label>
                <select
                  value={formData.from_account_id}
                  onChange={(e) => setFormData({ ...formData, from_account_id: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nickname || acc.type} - {formatCurrency(acc.balance, acc.currency)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {formData.transfer_type === 'internal'
                    ? 'To Account'
                    : formData.transfer_type === 'domestic'
                      ? 'Account Number'
                      : 'Recipient'}
                </label>
                <input
                  type="text"
                  value={formData.recipient}
                  onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                  placeholder={
                    formData.transfer_type === 'international' ? 'Select beneficiary' : 'Enter account details'
                  }
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Currency</label>
                  <input
                    type="text"
                    value={user?.primary_currency || 'USD'}
                    disabled
                    className="w-full px-4 py-2 border border-border rounded-lg bg-muted"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add a note for this transfer"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition font-medium disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Review Transfer'}
              </button>
            </form>
          </div>

          {/* Summary */}
            <div className="bg-white rounded-xl p-6 border border-border h-fit sticky top-24">
            <h3 className="font-bold text-foreground mb-4">Transfer Summary</h3>
              <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">{formatCurrency(formData.amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transfer Fee:</span>
                <span className="font-medium">{formatCurrency(fee)}</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between text-base font-bold">
                <span>Total:</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl p-8 border border-border">
          <h2 className="text-xl font-bold text-foreground mb-6">Recent Transfers</h2>
          <div className="space-y-3">
            {transfers.length > 0 ? (
              transfers.map((transfer) => (
                <div key={transfer.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-2xl">↔️</div>
                    <div>
                      <p className="font-medium text-foreground">{transfer.description}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(transfer.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(transfer.amount, transfer.currency)}</p>
                    <p className={`text-xs ${transfer.status === 'completed' ? 'text-success' : 'text-warning'}`}>
                      {transfer.status.toUpperCase()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border border-border rounded-lg">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-6 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
