import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Card } from '@/components/ui/card'
import { Landmark, Calculator, Receipt, ShieldCheck, ArrowRight, Clock, Percent } from 'lucide-react'
import Link from 'next/link'

export default function LoansPage() {
    return (
        <div className="bg-gray-50 min-h-screen">
            <Header />
            <div className="pt-16">
                <div className="bg-[#003366] text-white py-24 px-4 overflow-hidden relative">
                    <div className="absolute top-0 right-0 opacity-10 -mr-20 -mt-20">
                        <Landmark size={400} />
                    </div>
                    <div className="max-w-7xl mx-auto flex flex-col items-start relative z-10">
                        <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight">Fast. Flexible.<br />Financial Support.</h1>
                        <p className="text-xl opacity-90 max-w-xl font-medium mb-10">
                            From personal dreams to business expansion, our loans are designed to get you there faster with competitive rates.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link href="/auth/register" className="bg-[#00AEEF] hover:bg-[#0096CC] text-white px-10 py-4 rounded-full font-bold transition-all shadow-lg shadow-sky-500/20">
                                Apply Online
                            </Link>
                            <button className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-10 py-4 rounded-full font-bold transition-all backdrop-blur-sm">
                                Check Eligibility
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
                        <Card className="p-10 border-none shadow-sm hover:shadow-xl transition-all">
                            <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
                                <Calculator className="text-[#00AEEF] w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold mb-4">Personal Loans</h2>
                            <p className="text-gray-600 mb-8 font-medium">Get up to $50,000 for your personal needs with instant approval and flexible tenure.</p>
                            <div className="space-y-4 border-t pt-8">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-gray-400">Interest Rates</span>
                                    <span className="text-[#00AEEF]">From 3.88% p.a.</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-gray-400">Processing Time</span>
                                    <span className="text-gray-900">Instant Approval</span>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-10 border-none shadow-sm hover:shadow-xl transition-all">
                            <div className="bg-green-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
                                <Percent className="text-green-600 w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold mb-4">Business Loans</h2>
                            <p className="text-gray-600 mb-8 font-medium">Unsecured business loans up to $300,000 to help manage cash flow and growth.</p>
                            <div className="space-y-4 border-t pt-8">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-gray-400">Loan Amount</span>
                                    <span className="text-green-600">Up to $300,000</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-gray-400">Repayment</span>
                                    <span className="text-gray-900">Up to 5 years</span>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-10 border-none shadow-sm hover:shadow-xl transition-all text-white bg-gradient-to-br from-indigo-900 to-blue-900">
                            <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
                                <Receipt className="text-blue-300 w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold mb-4">Specialized Financing</h2>
                            <p className="opacity-70 mb-8 font-medium">Customized solutions for renovation, education, and medical needs.</p>
                            <Link href="/auth/register" className="inline-flex items-center gap-2 font-bold hover:gap-4 transition-all">
                                View All Options <ArrowRight className="w-5 h-5" />
                            </Link>
                        </Card>
                    </div>

                    <section className="bg-white rounded-[3rem] p-16 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-12 items-center">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 bg-blue-50 text-[#0066CC] px-4 py-1.5 rounded-full text-xs font-bold mb-6">
                                <ShieldCheck className="w-4 h-4" /> SECURE PROCESS
                            </div>
                            <h3 className="text-3xl font-bold mb-6">Simple Application Process</h3>
                            <div className="space-y-8">
                                {[
                                    { step: "01", title: "Apply Online", desc: "Fill out our digital application form in minutes using your mobile or laptop." },
                                    { step: "02", title: "Instant Review", desc: "Our AI-powered system reviews your application instantly (for personal loans)." },
                                    { step: "03", title: "Document Upload", desc: "Securely upload your ID and income proof directly through our portal." },
                                    { step: "04", title: "Disbursement", desc: "Upon approval, funds are disbursed directly to your account within 24 hours." }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-6">
                                        <span className="text-4xl font-black text-gray-100">{item.step}</span>
                                        <div>
                                            <h5 className="font-bold text-gray-900">{item.title}</h5>
                                            <p className="text-gray-500 text-sm">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-3xl p-12 text-center">
                            <Clock className="w-16 h-16 text-blue-200 mx-auto mb-6" />
                            <h4 className="text-xl font-bold mb-2">Need it faster?</h4>
                            <p className="text-gray-500 mb-8 text-sm">Existing customers can get pre-approved loans with zero documentation through our mobile app.</p>
                            <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg">Open App</button>
                        </div>
                    </section>
                </div>
            </div>
            <Footer />
        </div>
    )
}
