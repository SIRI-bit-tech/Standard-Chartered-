import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Card } from '@/components/ui/card'
import { Landmark, ShieldCheck, Key, Calculator, Sun } from 'lucide-react'
import Link from 'next/link'

export default function MortgagesPage() {
    return (
        <div className="bg-gray-50 min-h-screen">
            <Header />
            <div className="pt-16">
                <div className="relative h-[600px] flex items-center justify-center overflow-hidden bg-gray-900">
                    <img
                        src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80"
                        alt="Modern Home"
                        className="absolute inset-0 w-full h-full object-cover opacity-50"
                    />
                    <div className="relative z-10 max-w-4xl mx-auto text-center px-4 text-white">
                        <h1 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight">Your Dream Home.<br />Our Expertise.</h1>
                        <p className="text-xl md:text-2xl mb-12 opacity-90 font-medium">
                            International mortgage banking with tailored solutions for home buyers and investors.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Link href="/auth/register" className="bg-[#56B949] hover:bg-[#4AA53F] text-white px-12 py-5 rounded-full font-bold text-lg transition-all shadow-xl shadow-green-600/20">
                                Get Your Quote
                            </Link>
                            <button className="bg-white/10 hover:bg-white/20 border border-white/40 text-white px-12 py-5 rounded-full font-bold text-lg transition-all backdrop-blur-md">
                                Consult an Expert
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-20">
                        <Card className="p-10 border-none shadow-xl hover:shadow-2xl transition-all rounded-[2rem]">
                            <div className="bg-green-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
                                <Key className="text-[#56B949] w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">First-Time Home Buyers</h3>
                            <p className="text-gray-600 mb-8 leading-relaxed">Dedicated guidance and competitive rates to help you step into your first home with confidence.</p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex gap-2 text-sm font-medium"><ShieldCheck className="w-5 h-5 text-green-500" /> Lower down payment options</li>
                                <li className="flex gap-2 text-sm font-medium"><ShieldCheck className="w-5 h-5 text-green-500" /> Step-by-step guidance</li>
                            </ul>
                        </Card>

                        <Card className="p-10 border-none shadow-xl hover:shadow-2xl transition-all rounded-[2rem] bg-[#1a1a1a] text-white">
                            <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
                                <Landmark className="text-white w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">International Mortgages</h3>
                            <p className="opacity-70 mb-8 leading-relaxed">Cross-border financing solutions for properties in major global hubs like Singapore, Hong Kong, and London.</p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex gap-2 text-sm font-medium opacity-80"><ShieldCheck className="w-5 h-5 text-blue-400" /> Multi-currency financing</li>
                                <li className="flex gap-2 text-sm font-medium opacity-80"><ShieldCheck className="w-5 h-5 text-blue-400" /> Specialized tax advice</li>
                            </ul>
                        </Card>

                        <Card className="p-10 border-none shadow-xl hover:shadow-2xl transition-all rounded-[2rem]">
                            <div className="bg-orange-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
                                <Sun className="text-orange-500 w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Sustainable Home Loans</h3>
                            <p className="text-gray-600 mb-8 leading-relaxed">Eco-friendly mortgage options with preferential rates for energy-efficient homes.</p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex gap-2 text-sm font-medium"><ShieldCheck className="w-5 h-5 text-green-500" /> Energy efficiency discounts</li>
                                <li className="flex gap-2 text-sm font-medium"><ShieldCheck className="w-5 h-5 text-green-500" /> Fast-track processing</li>
                            </ul>
                        </Card>
                    </div>

                    <div className="bg-[#F2F7FA] rounded-[3rem] p-16 flex flex-col lg:flex-row gap-16 items-center">
                        <div className="flex-1">
                            <h2 className="text-4xl font-black text-gray-900 mb-8 tracking-tight">One Step Closer to<br />Your New Chapter.</h2>
                            <div className="space-y-8">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm font-bold text-[#56B949]">1</div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">Check Your Borrowing Power</h4>
                                        <p className="text-sm text-gray-500">Use our online calculator for a quick estimate of how much you can borrow.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm font-bold text-[#56B949]">2</div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">Get an In-Principle Approval</h4>
                                        <p className="text-sm text-gray-500">Know your budget with an IPA, valid for up to 30 days while you house hunt.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm font-bold text-[#56B949]">3</div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">Finalize & Sign</h4>
                                        <p className="text-sm text-gray-500">Once you find your home, we speed up the final approval and documentation.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 w-full">
                            <Card className="p-8 border-none shadow-2xl rounded-3xl">
                                <div className="flex items-center gap-3 mb-8">
                                    <Calculator className="w-6 h-6 text-[#0066CC]" />
                                    <h4 className="text-xl font-bold">Mortgage Calculator</h4>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Property Price</label>
                                        <input type="text" className="w-full bg-gray-50 border-none rounded-xl p-4 text-xl font-bold text-gray-900 focus:ring-2 focus:ring-green-400 outline-none" defaultValue="$850,000" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase">Down Payment (%)</label>
                                            <input type="text" className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-gray-900 outline-none" defaultValue="20%" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase">Tenure (Years)</label>
                                            <input type="text" className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-gray-900 outline-none" defaultValue="30" />
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-900 rounded-2xl text-white text-center">
                                        <p className="text-xs opacity-60 mb-1 uppercase tracking-widest">Estimated Monthly Repayment</p>
                                        <h3 className="text-3xl font-black">$3,425.00</h3>
                                    </div>
                                    <button className="w-full py-4 text-[#56B949] font-black border-2 border-[#56B949] rounded-2xl hover:bg-green-50 transition-all">Full Eligibility Check</button>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
