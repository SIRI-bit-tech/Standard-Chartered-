'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import { formatCurrency, formatDate, toTitleCase } from '@/lib/utils'
import type { LoanProduct, LoanApplication, Loan } from '@/types'

export default function LoansPage() {
  const [activeTab, setActiveTab] = useState('browse')
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [applications, setApplications] = useState<LoanApplication[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(null)
  const [applicationData, setApplicationData] = useState({
    amount: 10000 as number,
    term: 12 as number,
    purpose: '',
  })
  const { user } = useAuthStore()

  useEffect(() => {
    loadLoansData()
  }, [user])

  const loadLoansData = async () => {
    if (!user) return

    try {
      // Load products
      const productsResponse = await apiClient.get<{ success: boolean; data: LoanProduct[] }>(`/api/v1/loans/products?user_tier=${user.tier}`)
      if (productsResponse.success && productsResponse.data) {
        setProducts(productsResponse.data)
      }

      // Load applications
      const applicationsResponse = await apiClient.get<{ success: boolean; data: LoanApplication[] }>(
        `/api/v1/loans/applications`
      )
      if (applicationsResponse.success && applicationsResponse.data) {
        setApplications(applicationsResponse.data)
      }

      // Load active loans
      const loansResponse = await apiClient.get<{ success: boolean; data: Loan[] }>(`/api/v1/loans/accounts`)
      if (loansResponse.success && loansResponse.data) {
        setLoans(loansResponse.data)
      }
    } catch (error) {
      console.error('Failed to load loans data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyForLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedProduct) return

    setLoading(true)
    try {
      const response = await apiClient.post<{ success: boolean; data: any }>('/api/v1/loans/apply', {
        product_id: selectedProduct.id,
        requested_amount: applicationData.amount,
        requested_term: applicationData.term,
        purpose: applicationData.purpose,
      })

      if (response.success) {
        alert('Loan application submitted successfully!')
        setSelectedProduct(null)
        await loadLoansData()
      }
    } catch (error) {
      console.error('Failed to apply for loan:', error)
      alert('Failed to submit loan application. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Loans & Credit</h1>

      {/* Tabs */}
      <div className="bg-white border-b border-border rounded-t-xl">
        <div className="flex gap-8 px-6 py-4 flex-wrap">
          <button
            onClick={() => setActiveTab('browse')}
            className={`py-2 font-medium transition ${
              activeTab === 'browse'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Browse Products
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`py-2 font-medium transition ${
              activeTab === 'applications'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Applications ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 font-medium transition ${
              activeTab === 'active'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Active Loans ({loans.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading loans data...</div>
      ) : (
        <>
          {/* Browse Products */}
          {activeTab === 'browse' && (
            <div className="space-y-6">
              {selectedProduct ? (
                // Application Form
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white rounded-xl p-8 border border-border">
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="text-primary hover:underline mb-6"
                    >
                      ← Back to Products
                    </button>

                    <h2 className="text-2xl font-bold text-foreground mb-6">
                      Apply for {selectedProduct.name}
                    </h2>

                    <form onSubmit={handleApplyForLoan} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Loan Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                          <input
                            type="number"
                            min={selectedProduct.min_amount}
                            max={selectedProduct.max_amount}
                            value={applicationData.amount}
                            onChange={(e) =>
                              setApplicationData({
                                ...applicationData,
                                amount: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full pl-8 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                            required
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Min: {formatCurrency(selectedProduct.min_amount)} | Max:{' '}
                          {formatCurrency(selectedProduct.max_amount)}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Loan Term (months)
                        </label>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min={selectedProduct.min_term}
                            max={selectedProduct.max_term}
                            value={applicationData.term}
                            onChange={(e) =>
                              setApplicationData({
                                ...applicationData,
                                term: parseInt(e.target.value) || 1,
                              })
                            }
                            className="flex-1"
                          />
                          <span className="font-bold text-foreground min-w-[50px]">
                            {applicationData.term}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Purpose (Optional)
                        </label>
                        <textarea
                          value={applicationData.purpose}
                          onChange={(e) =>
                            setApplicationData({ ...applicationData, purpose: e.target.value })
                          }
                          placeholder="Tell us how you plan to use this loan"
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary resize-none"
                          rows={4}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition font-medium disabled:opacity-50"
                      >
                        {loading ? 'Submitting...' : 'Submit Application'}
                      </button>
                    </form>
                  </div>

                  {/* Summary */}
                  <div className="bg-white rounded-xl p-6 border border-border h-fit sticky top-24">
                    <h3 className="font-bold text-foreground mb-4">{selectedProduct.name}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-medium">{formatCurrency(applicationData.amount || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interest Rate:</span>
                        <span className="font-medium">{selectedProduct.interest_rate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Term:</span>
                        <span className="font-medium">{applicationData.term} months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Monthly Payment:</span>
                        <span className="font-bold text-primary">
                          {formatCurrency(
                            ((applicationData.amount || 0) *
                              (selectedProduct.interest_rate / 12 / 100)) /
                              (1 - Math.pow(1 + selectedProduct.interest_rate / 12 / 100, -(applicationData.term || 1)))
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Product List
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {products.map((product) => (
                    <div key={product.id} className="bg-white rounded-xl p-6 border border-border hover:shadow-lg transition">
                      <h3 className="text-xl font-bold text-foreground mb-4">{product.name}</h3>
                      <p className="text-muted-foreground text-sm mb-6">{product.type}</p>

                      <div className="space-y-3 text-sm mb-6">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount Range:</span>
                          <span className="font-medium">
                            {formatCurrency(product.min_amount)} - {formatCurrency(product.max_amount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Interest Rate:</span>
                          <span className="font-bold text-foreground">{product.interest_rate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Term:</span>
                          <span className="font-medium">
                            {product.min_term} - {product.max_term} months
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition font-medium"
                      >
                        Apply Now
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Applications */}
          {activeTab === 'applications' && (
            <div className="bg-white rounded-xl p-6 border border-border">
              {applications.length > 0 ? (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">Loan Application</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(app.requested_amount)} • {app.requested_term} months
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-medium capitalize ${
                            app.status === 'approved'
                              ? 'text-success'
                              : app.status === 'rejected'
                                ? 'text-error'
                                : 'text-warning'
                          }`}
                        >
                          {app.status}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(app.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No applications yet</div>
              )}
            </div>
          )}

          {/* Active Loans */}
          {activeTab === 'active' && (
            <div className="space-y-6">
              {loans.length > 0 ? (
                loans.map((loan) => (
                  <div key={loan.id} className="bg-white rounded-xl p-6 border border-border">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{toTitleCase(loan.type)}</h3>
                        <p className="text-muted-foreground text-sm">Loan #{loan.id.slice(0, 8)}</p>
                      </div>
                      <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm font-medium">
                        Active
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-muted-foreground text-sm mb-1">Principal Amount</p>
                        <p className="font-bold text-foreground">{formatCurrency(loan.principal_amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm mb-1">Remaining Balance</p>
                        <p className="font-bold text-foreground">{formatCurrency(loan.remaining_balance)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm mb-1">Monthly Payment</p>
                        <p className="font-bold text-foreground">{formatCurrency(loan.monthly_payment)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm mb-1">Interest Rate</p>
                        <p className="font-bold text-foreground">{loan.interest_rate}%</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex gap-3">
                      <button className="flex-1 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition text-sm">
                        Make Payment
                      </button>
                      <button className="flex-1 py-2 border border-border rounded-lg hover:bg-border transition text-sm">
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-xl p-12 text-center border border-border">
                  <p className="text-muted-foreground mb-4">No active loans</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
