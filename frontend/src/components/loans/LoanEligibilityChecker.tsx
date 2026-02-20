import React from 'react'
import { Landmark, TrendingUp, Sparkles, ShieldCheck } from 'lucide-react'

interface LoanEligibilityCheckerProps {
    onStart: () => void
}

export const LoanEligibilityChecker: React.FC<LoanEligibilityCheckerProps> = ({ onStart }) => {
    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0066CC] to-[#0052A3] rounded-3xl p-8 md:p-12 mb-12 shadow-2xl">
            {/* Background patterns */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/10 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />

            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 bg-blue-400/20 backdrop-blur-sm px-3 py-1 rounded-full border border-blue-300/30">
                        <Sparkles size={14} className="text-blue-200" />
                        <span className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Pre-Approved Offers</span>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-black text-white leading-[1.1]">
                        Fast Capital for Your <span className="text-blue-200 underline decoration-blue-400/50 underline-offset-8">Brightest Ideas</span>
                    </h2>

                    <p className="text-blue-100/80 text-lg max-w-lg leading-relaxed">
                        Standard Chartered provides competitive interest rates and flexible repayment options to help you achieve your financial goals.
                    </p>

                    <div className="flex flex-wrap gap-6 pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                <TrendingUp size={20} className="text-blue-200" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Low Rates</p>
                                <p className="text-blue-200/60 text-xs">From 4.5% APR</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                <ShieldCheck size={20} className="text-blue-200" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Instant Approval</p>
                                <p className="text-blue-200/60 text-xs">Under 24 Hours</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={onStart}
                            className="group relative bg-white text-primary px-8 py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95 overflow-hidden"
                        >
                            <span className="relative z-10">Continue Application</span>
                            <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                </div>

                <div className="hidden lg:block">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-400/20 blur-3xl rounded-full" />
                        <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] p-8 shadow-2xl">
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <Landmark className="text-blue-200" size={32} />
                                    <div className="px-3 py-1 bg-green-400/20 rounded-lg border border-green-400/30">
                                        <span className="text-[10px] font-black text-green-300 uppercase tracking-widest">Elite Member Status</span>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-blue-200/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">Estimated Credit Limit</p>
                                    <p className="text-4xl font-black text-white">$250,000.00</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/10">
                                    <div>
                                        <p className="text-blue-200/40 text-[10px] font-bold uppercase mb-1">Processing Time</p>
                                        <p className="text-white font-medium text-sm">~ 15 Minutes</p>
                                    </div>
                                    <div>
                                        <p className="text-blue-200/40 text-[10px] font-bold uppercase mb-1">Repayment Grace</p>
                                        <p className="text-white font-medium text-sm">Up to 60 Days</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-8 h-8 rounded-full border-2 border-primary bg-white/20 overflow-hidden">
                                                <img src={`https://i.pravatar.cc/32?u=${i}`} alt="User" />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-blue-200/60 text-[10px] font-medium leading-tight">
                                        Join <span className="text-white font-black">12k+ members</span> who funded their dreams this month.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
