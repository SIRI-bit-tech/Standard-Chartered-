'use client'

import { useEffect, useState, useRef } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import { formatCurrency, formatDate, toTitleCase } from '@/lib/utils'
import type { LoanProduct, LoanApplication, Loan, ApiResponse } from '@/types'
import { LoanProductCard } from '@/components/loans/LoanProductCard'
import { LoanEligibilityChecker } from '@/components/loans/LoanEligibilityChecker'
import { LoanApplicationForm } from '@/components/loans/LoanApplicationForm'
import { Landmark, FileText, Activity, Layers, ArrowRight, ShieldCheck, HelpCircle, CheckCircle2, Clock, XCircle } from 'lucide-react'

export default function LoansPage() {
  const [activeTab, setActiveTab] = useState<'browse' | 'applications' | 'active'>('browse')
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [applications, setApplications] = useState<LoanApplication[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(null)
  const { user } = useAuthStore()
  const solutionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadLoansData()
  }, [user])

  const loadLoansData = async () => {
    if (!user) return

    try {
      // Load products (Mocking more products if backend returns few)
      const productsResponse = await apiClient.get<ApiResponse<LoanProduct[]>>(`/api/v1/loans/products?user_tier=${user.tier}`)
      if (productsResponse?.success) {
        setProducts(productsResponse.data)
      }

      // Load applications
      const applicationsResponse = await apiClient.get<ApiResponse<LoanApplication[]>>(`/api/v1/loans/applications`)
      if (applicationsResponse?.success) {
        setApplications(applicationsResponse.data)
      }

      // Load active loans
      const loansResponse = await apiClient.get<ApiResponse<Loan[]>>(`/api/v1/loans/accounts`)
      if (loansResponse?.success) {
        setLoans(loansResponse.data)
      }
    } catch (error) {
      console.error('Failed to load loans data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplicationSuccess = async () => {
    setSelectedProduct(null)
    setActiveTab('applications')
    await loadLoansData()
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <CheckCircle2 className="text-green-500" size={16} />
      case 'rejected': return <XCircle className="text-red-500" size={16} />
      case 'under_review':
      case 'submitted': return <Clock className="text-amber-500" size={16} />
      default: return <Clock className="text-gray-400" size={16} />
    }
  }

  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-50 text-green-700 border-green-100'
      case 'rejected': return 'bg-red-50 text-red-700 border-red-100'
      case 'under_review':
      case 'submitted': return 'bg-amber-50 text-amber-700 border-amber-100'
      default: return 'bg-gray-50 text-gray-700 border-gray-100'
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Loans & Financing</h1>
          <p className="text-gray-500 font-medium mt-1">Empowering your financial journey with flexible solutions.</p>
        </div>

        <div className="flex bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200 w-fit">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'browse' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Landmark size={16} /> Browse
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'applications' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <FileText size={16} /> Applications {applications.length > 0 && <span className="ml-1 bg-primary/10 px-1.5 rounded-md text-[10px]">{applications.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Activity size={16} /> My Loans {loans.length > 0 && <span className="ml-1 bg-primary/10 px-1.5 rounded-md text-[10px]">{loans.length}</span>}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-gray-100 border-t-primary rounded-full animate-spin" />
          <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Gathering Rates...</p>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {activeTab === 'browse' && (
            <>
              {selectedProduct ? (
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-2xl overflow-hidden">
                  <LoanApplicationForm
                    product={selectedProduct}
                    onSuccess={handleApplicationSuccess}
                    onCancel={() => setSelectedProduct(null)}
                  />
                </div>
              ) : (
                <div className="space-y-12">
                  <LoanEligibilityChecker onStart={() => solutionsRef.current?.scrollIntoView({ behavior: 'smooth' })} />

                  <div ref={solutionsRef} className="space-y-8">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                        <Layers className="text-primary" size={24} /> Recommended Solutions
                      </h2>
                      <div className="flex items-center gap-2 text-primary font-bold text-sm cursor-pointer hover:underline">
                        View Details <ArrowRight size={14} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                      {products.length > 0 ? (
                        products.map((product) => (
                          <LoanProductCard
                            key={product.id}
                            product={product}
                            onApply={setSelectedProduct}
                          />
                        ))
                      ) : (
                        <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No products currently available for your tier</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'applications' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {applications.length > 0 ? (
                  applications.map((app) => {
                    const product = products.find(p => p.id === app.product_id)
                    return (
                      <div key={app.id} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-primary/20 shadow-sm transition-all group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-blue-50 transition-colors">
                              <FileText className="text-gray-400 group-hover:text-primary transition-colors" size={20} />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">{product?.name || 'Loan Application'}</h4>
                              <p className="text-xs text-gray-500 font-medium">Applied on {formatDate(app.created_at)}</p>
                            </div>
                          </div>

                          <div className={`px-4 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 ${getStatusStyles(app.status)}`}>
                            {getStatusIcon(app.status)}
                            {toTitleCase(app.status)}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-8 mt-6 pt-6 border-t border-gray-50">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Requested Amount</p>
                            <p className="text-sm font-bold text-gray-900">{formatCurrency(app.requested_amount)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Period</p>
                            <p className="text-sm font-bold text-gray-900">{app.requested_term} Months</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Application ID</p>
                            <p className="text-sm font-bold text-gray-900">#{app.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </div>

                        {app.rejection_reason && (
                          <div className="mt-4 p-3 bg-red-50/50 rounded-lg flex items-start gap-2 border border-red-50">
                            <HelpCircle className="text-red-400 mt-0.5" size={12} />
                            <p className="text-[10px] text-red-600 font-medium leading-relaxed">
                              {app.rejection_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-3xl p-20 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm mb-6">
                      <FileText className="text-gray-200" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No applications on file</h3>
                    <p className="text-sm text-gray-500 max-w-xs mt-2">Ready to fund your next project? Browse our loan products to get started.</p>
                    <button
                      onClick={() => setActiveTab('browse')}
                      className="mt-8 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-primary font-bold text-sm shadow-sm hover:shadow-md transition-all"
                    >
                      Start New Application
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2C2C2C] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden h-fit">
                  <div className="relative z-10">
                    <h4 className="font-bold flex items-center gap-2 mb-4">
                      <ShieldCheck className="text-blue-400" size={18} /> Approval Process
                    </h4>
                    <ul className="space-y-4">
                      <li className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-blue-400">1</span>
                        </div>
                        <p className="text-xs text-gray-400">Application verification by our underwriting team.</p>
                      </li>
                      <li className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-blue-400">2</span>
                        </div>
                        <p className="text-xs text-gray-400">Final credit review and limit assignment.</p>
                      </li>
                      <li className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="text-green-400" size={14} />
                        </div>
                        <p className="text-xs text-gray-400">Approval and instant disbursement to your account.</p>
                      </li>
                    </ul>
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'active' && (
            <div className="space-y-8">
              {loans.length > 0 ? (
                <div className="grid grid-cols-1 gap-8">
                  {loans.map((loan) => (
                    <div key={loan.id} className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden group">
                      <div className="p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-gray-50">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-black text-gray-900">{toTitleCase(loan.type)}</h3>
                            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-green-100">
                              Active Repayment
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 font-medium">Facility ID: #{loan.id.slice(0, 12).toUpperCase()}</p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Outstanding Balance</p>
                          <p className="text-4xl font-black text-primary">{formatCurrency(loan.remaining_balance)}</p>
                        </div>
                      </div>

                      <div className="p-8 md:p-10 grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-12 bg-gray-50/30">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Principal</p>
                          <p className="text-lg font-black text-gray-900">{formatCurrency(loan.principal_amount)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Interest Rate</p>
                          <p className="text-lg font-black text-gray-900">{loan.interest_rate}% APR</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Monthly EMI</p>
                          <p className="text-lg font-black text-primary">{formatCurrency(loan.monthly_payment)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Next Payment</p>
                          <p className="text-lg font-black text-gray-900">{formatDate(loan.next_payment_date)}</p>
                        </div>
                      </div>

                      <div className="px-8 md:px-10 py-6 bg-white flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-primary">
                            <Clock size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">{loan.payments_made} Payments Made</p>
                            <div className="w-32 h-1.5 bg-gray-100 rounded-full mt-1">
                              <div className="h-full bg-primary rounded-full" style={{ width: '45%' }} />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          <button className="flex-1 sm:flex-none px-6 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
                            Repayment Schedule
                          </button>
                          <button className="flex-1 sm:flex-none px-8 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all">
                            Make Quick Payment
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-[40px] p-20 flex flex-col items-center text-center shadow-xl">
                  <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-8">
                    <Landmark className="text-primary-light" size={48} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">No active facilities</h3>
                  <p className="text-gray-500 max-w-sm mt-3 leading-relaxed">
                    You don't have any active loans or credit lines at the moment. Browse our products to find the perfect solution for you.
                  </p>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="mt-10 px-10 py-4 bg-primary text-white rounded-[20px] font-black shadow-xl shadow-blue-200 hover:translate-y-1 transition-all"
                  >
                    View Loan Products
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
