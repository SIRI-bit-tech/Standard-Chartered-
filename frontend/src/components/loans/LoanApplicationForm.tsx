import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Briefcase, DollarSign, Target, CreditCard, ShieldCheck, AlertCircle } from 'lucide-react'
import { StepIndicator } from './StepIndicator'
import type { LoanProduct } from '@/types'
import { useAccountStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'

interface LoanApplicationFormProps {
    product: LoanProduct
    onSuccess: () => void
    onCancel: () => void
}

const STEPS = [
    { id: 1, name: 'Personal Details' },
    { id: 2, name: 'Loan Config' },
    { id: 3, name: 'Review & Submit' }
]

export const LoanApplicationForm: React.FC<LoanApplicationFormProps> = ({ product, onSuccess, onCancel }) => {
    const [currentStep, setCurrentStep] = useState(1)
    const { accounts } = useAccountStore()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        employment_status: 'full_time',
        annual_income: 50000,
        employer_name: '',
        amount: Number(product.min_amount) || 0,
        duration_months: Number(product.min_term) || 0,
        purpose: 'Personal Projects',
        account_id: accounts[0]?.id || ''
    })

    useEffect(() => {
        if (accounts.length > 0 && !formData.account_id) {
            setFormData(prev => ({ ...prev, account_id: accounts[0].id }))
        }
    }, [accounts])

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1))

    const handleSubmit = async () => {
        setLoading(true)
        setError(null)
        try {
            await apiClient.post('/api/v1/loans/apply', {
                product_id: product.id,
                amount: formData.amount,
                duration_months: formData.duration_months,
                purpose: formData.purpose,
                account_id: formData.account_id,
                employment_status: formData.employment_status,
                annual_income: formData.annual_income,
                employer_name: formData.employer_name
            })
            onSuccess()
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit application. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const renderStep = () => {
        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="min-h-[400px]"
                >
                    {(() => {
                        switch (currentStep) {
                            case 1:
                                return (
                                    <div className="space-y-6">
                                        <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 mb-6">
                                            <ShieldCheck className="text-primary mt-1" size={20} />
                                            <div>
                                                <p className="text-sm font-bold text-primary">Secure Application</p>
                                                <p className="text-xs text-blue-700/70">Your financial information is encrypted and never shared.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                    <Briefcase size={14} /> Employment Status
                                                </label>
                                                <select
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-medium transition-all"
                                                    value={formData.employment_status}
                                                    onChange={(e) => setFormData({ ...formData, employment_status: e.target.value })}
                                                >
                                                    <option value="full_time">Full-time</option>
                                                    <option value="part_time">Part-time</option>
                                                    <option value="self_employed">Self-employed</option>
                                                    <option value="contract">Contract</option>
                                                    <option value="student">Student</option>
                                                    <option value="retired">Retired</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                    <DollarSign size={14} /> Annual Income (USD)
                                                </label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-medium transition-all"
                                                    value={formData.annual_income || ''}
                                                    onChange={(e) => setFormData({ ...formData, annual_income: parseInt(e.target.value) || 0 })}
                                                    placeholder="e.g. 50000"
                                                />
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-sm font-bold text-gray-700">Employer Name</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-medium transition-all"
                                                    value={formData.employer_name}
                                                    onChange={(e) => setFormData({ ...formData, employer_name: e.target.value })}
                                                    placeholder="Company name or 'Self'"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            case 2:
                                return (
                                    <div className="space-y-8">
                                        {/* Amount Slider */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-bold text-gray-700">How much do you need?</label>
                                                <span className="text-2xl font-black text-primary">{formatCurrency(formData.amount)}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={product.min_amount}
                                                max={product.max_amount}
                                                step={100}
                                                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                                                value={formData.amount || 0}
                                                onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                                            />
                                            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                <span>Min: {formatCurrency(product.min_amount)}</span>
                                                <span>Max: {formatCurrency(product.max_amount)}</span>
                                            </div>
                                        </div>

                                        {/* Duration Slider */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-bold text-gray-700">For how long?</label>
                                                <span className="text-xl font-black text-gray-900">{formData.duration_months} Months</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={product.min_term}
                                                max={product.max_term}
                                                step={1}
                                                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                                                value={formData.duration_months || 0}
                                                onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) || 0 })}
                                            />
                                            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                <span>Min: {product.min_term}M</span>
                                                <span>Max: {product.max_term}M</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                    <Target size={14} /> Purpose
                                                </label>
                                                <select
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-medium transition-all"
                                                    value={formData.purpose}
                                                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                                >
                                                    <option>Personal Projects</option>
                                                    <option>Education</option>
                                                    <option>Medical Expenses</option>
                                                    <option>Debt Consolidation</option>
                                                    <option>Home Improvement</option>
                                                    <option>Travel & Leisure</option>
                                                    <option>Vehicle Purchase</option>
                                                    <option>Other</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                    <CreditCard size={14} /> Disbursement Account
                                                </label>
                                                <select
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-medium transition-all"
                                                    value={formData.account_id}
                                                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                                                >
                                                    {accounts.map(acc => (
                                                        <option key={acc.id} value={acc.id}>
                                                            {acc.type.toUpperCase()} • {acc.account_number.slice(-4)} ({formatCurrency(acc.balance, acc.currency)})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )
                            case 3:
                                const rate = (product.interest_rate || 0) / 100 / 12
                                const months = formData.duration_months || 0
                                let monthlyPayment = 0
                                if (rate > 0 && months > 0) {
                                    monthlyPayment = (formData.amount * rate) / (1 - Math.pow(1 + rate, -months))
                                } else if (months > 0) {
                                    monthlyPayment = formData.amount / months
                                }

                                return (
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-2xl border-2 border-primary/10 p-6 space-y-6">
                                            <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                                                <ShieldCheck className="text-primary" size={18} /> Review Your Application
                                            </h4>

                                            <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Product</p>
                                                    <p className="text-sm font-bold text-gray-900">{product.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Interest Rate</p>
                                                    <p className="text-sm font-bold text-primary">{product.interest_rate}% APR</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Loan Amount</p>
                                                    <p className="text-xl font-black text-gray-900">{formatCurrency(formData.amount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Monthly Payment (Est.)</p>
                                                    <p className="text-xl font-black text-primary">{formatCurrency(monthlyPayment)}/mo</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Duration</p>
                                                    <p className="text-sm font-bold text-gray-900">{formData.duration_months} Months</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Purpose</p>
                                                    <p className="text-sm font-bold text-gray-900">{formData.purpose}</p>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-gray-100">
                                                <label className="flex items-start gap-3 cursor-pointer group">
                                                    <div className="relative flex items-center mt-1">
                                                        <input type="checkbox" className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-200 transition-all checked:bg-primary checked:border-primary" />
                                                        <span className="absolute text-white transition-opacity opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-700 transition-colors">
                                                        I agree to the <span className="text-primary font-bold underline cursor-pointer">Loan Agreement</span> and <span className="text-primary font-bold underline cursor-pointer">Terms of Service</span>. I confirm that all information provided is accurate and complete.
                                                    </span>
                                                </label>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold flex items-center gap-3 border border-red-100">
                                                <AlertCircle size={14} /> {error}
                                            </div>
                                        )}
                                    </div>
                                )
                            default:
                                return null
                        }
                    })()}
                </motion.div>
            </AnimatePresence>
        )
    }

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">{product.name}</h2>
                    <p className="text-sm text-gray-500 font-medium tracking-tight">Step {currentStep} of {STEPS.length}</p>
                </div>
                <button
                    onClick={onCancel}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <Target className="rotate-45" size={24} />
                </button>
            </div>

            <StepIndicator steps={STEPS} currentStep={currentStep} />

            {renderStep()}

            <div className="flex items-center justify-between mt-12 pt-8 border-t border-gray-100">
                <button
                    onClick={prevStep}
                    disabled={currentStep === 1 || loading}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-all"
                >
                    <ChevronLeft size={18} /> Back
                </button>

                {currentStep === STEPS.length ? (
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-primary hover:bg-primary-dark text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Confirm & Finalize'
                        )}
                    </button>
                ) : (
                    <button
                        onClick={nextStep}
                        className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2 hover:translate-x-1"
                    >
                        Continue Application <ChevronRight size={18} />
                    </button>
                )}
            </div>
        </div>
    )
}
