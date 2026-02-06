'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useAccountStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function BillsPage() {
  const [activeTab, setActiveTab] = useState('payees')
  const [payees, setPayees] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [scheduled, setScheduled] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPayee, setShowAddPayee] = useState(false)
  const [payeeForm, setPayeeForm] = useState({
    name: '',
    account_number: '',
    category: '',
  })
  const { user } = useAuthStore()
  const { accounts } = useAccountStore()

  useEffect(() => {
    loadBillData()
  }, [user])

  const loadBillData = async () => {
    if (!user) return

    try {
      // Load payees
      const payeesResponse = await apiClient.get(`/api/v1/bills/payees?user_id=${user.id}`)
      if (payeesResponse.success) {
        setPayees(payeesResponse.data)
      }

      // Load history
      const historyResponse = await apiClient.get(
        `/api/v1/bills/history?user_id=${user.id}&limit=20`
      )
      if (historyResponse.success) {
        setHistory(historyResponse.data)
      }

      // Load scheduled
      const scheduledResponse = await apiClient.get(
        `/api/v1/bills/scheduled?user_id=${user.id}`
      )
      if (scheduledResponse.success) {
        setScheduled(scheduledResponse.data)
      }
    } catch (error) {
      console.error('Failed to load bill data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPayee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const response = await apiClient.post('/api/v1/bills/payees', {
        user_id: user.id,
        ...payeeForm,
      })

      if (response.success) {
        alert('Payee added successfully!')
        setPayeeForm({ name: '', account_number: '', category: '' })
        setShowAddPayee(false)
        await loadBillData()
      }
    } catch (error) {
      console.error('Failed to add payee:', error)
      alert('Failed to add payee')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Bill Payment</h1>

      {/* Tabs */}
      <div className="bg-white border-b border-border rounded-t-xl">
        <div className="flex gap-8 px-6 py-4 flex-wrap">
          <button
            onClick={() => setActiveTab('payees')}
            className={`py-2 font-medium transition ${
              activeTab === 'payees'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Payees ({payees.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 font-medium transition ${
              activeTab === 'history'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Payment History
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`py-2 font-medium transition ${
              activeTab === 'scheduled'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Scheduled Payments ({scheduled.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading bill data...</div>
      ) : (
        <>
          {/* Payees */}
          {activeTab === 'payees' && (
            <div className="space-y-6">
              <button
                onClick={() => setShowAddPayee(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
              >
                + Add Payee
              </button>

              {showAddPayee && (
                <div className="bg-white rounded-xl p-6 border border-border">
                  <h3 className="text-xl font-bold text-foreground mb-4">Add New Payee</h3>
                  <form onSubmit={handleAddPayee} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Payee Name
                      </label>
                      <input
                        type="text"
                        value={payeeForm.name}
                        onChange={(e) => setPayeeForm({ ...payeeForm, name: e.target.value })}
                        placeholder="e.g., Electric Company"
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={payeeForm.account_number}
                        onChange={(e) =>
                          setPayeeForm({ ...payeeForm, account_number: e.target.value })
                        }
                        placeholder="Account number for this payee"
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Category
                      </label>
                      <select
                        value={payeeForm.category}
                        onChange={(e) => setPayeeForm({ ...payeeForm, category: e.target.value })}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select category</option>
                        <option value="utilities">Utilities</option>
                        <option value="insurance">Insurance</option>
                        <option value="rent">Rent/Mortgage</option>
                        <option value="phone">Phone/Internet</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddPayee(false)}
                        className="flex-1 py-2 border border-border rounded-lg hover:bg-border transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                      >
                        Add Payee
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {payees.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {payees.map((payee) => (
                    <div key={payee.id} className="bg-white rounded-lg p-4 border border-border">
                        <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">{payee.name}</h4>
                          <p className="text-sm text-muted-foreground">{payee.category}</p>
                          <p className="text-xs text-muted-foreground mt-1">****{payee.account_number.slice(-4)}</p>
                        </div>
                        <button className="px-3 py-1 bg-primary/10 text-primary rounded text-sm hover:bg-primary/20 transition">
                          Pay
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl p-12 text-center border border-border">
                  <p className="text-muted-foreground">No payees added yet</p>
                </div>
              )}
            </div>
          )}

          {/* Payment History */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-xl p-6 border border-border">
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{payment.payee_id}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(payment.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(payment.amount)}</p>
                        <p
                          className={`text-xs font-medium ${
                            payment.status === 'paid'
                              ? 'text-success'
                              : payment.status === 'pending'
                                ? 'text-warning'
                                : 'text-error'
                          }`}
                        >
                          {payment.status.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No payment history</div>
              )}
            </div>
          )}

          {/* Scheduled Payments */}
          {activeTab === 'scheduled' && (
            <div className="bg-white rounded-xl p-6 border border-border">
              {scheduled.length > 0 ? (
                <div className="space-y-3">
                  {scheduled.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{payment.payee_id}</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.frequency} • Next: {formatDate(payment.next_payment_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(payment.amount)}</p>
                        <button className="text-sm text-error hover:underline">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No scheduled payments</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
