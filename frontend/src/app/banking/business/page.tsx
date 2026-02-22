import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Card } from '@/components/ui/card'
import { Briefcase, Globe, BarChart3, TrendingUp, ArrowRight, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function BusinessBankingPage() {
    return (
        <div className="bg-gray-50 min-h-screen">
            <Header />
            <div className="pt-16">
                {/* Hero Section */}
                <div className="bg-[#1C1C1C] text-white py-20 px-4">
                    <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">Business Banking</h1>
                        <p className="text-xl opacity-90 max-w-2xl">
                            Empowering your business journey with tailored financial solutions and global expertise.
                        </p>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                        <Card className="p-6 border-none shadow-sm hover:shadow-md transition-all">
                            <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                                <Briefcase className="text-[#0066CC] w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Business Accounts</h3>
                            <p className="text-sm text-gray-500 mb-4">Flexible accounts designed for SMEs and large corporations.</p>
                            <Link href="/auth/register" className="text-[#0066CC] text-sm font-semibold flex items-center gap-1">
                                Explore <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Card>

                        <Card className="p-6 border-none shadow-sm hover:shadow-md transition-all">
                            <div className="bg-green-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                                <Globe className="text-green-600 w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Trade Finance</h3>
                            <p className="text-sm text-gray-500 mb-4">Support for your import, export, and international trade needs.</p>
                            <Link href="/auth/register" className="text-[#0066CC] text-sm font-semibold flex items-center gap-1">
                                Explore <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Card>

                        <Card className="p-6 border-none shadow-sm hover:shadow-md transition-all">
                            <div className="bg-purple-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                                <BarChart3 className="text-purple-600 w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Cash Management</h3>
                            <p className="text-sm text-gray-500 mb-4">Optimize your liquidity with our efficient cash management tools.</p>
                            <Link href="/auth/register" className="text-[#0066CC] text-sm font-semibold flex items-center gap-1">
                                Explore <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Card>

                        <Card className="p-6 border-none shadow-sm hover:shadow-md transition-all">
                            <div className="bg-orange-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                                <TrendingUp className="text-orange-600 w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Lending Solutions</h3>
                            <p className="text-sm text-gray-500 mb-4">Working capital and term loans to fuel your business growth.</p>
                            <Link href="/auth/register" className="text-[#0066CC] text-sm font-semibold flex items-center gap-1">
                                Explore <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold mb-6">International Network</h2>
                            <p className="text-gray-600 mb-6 font-medium">Standard Chartered is uniquely positioned to help you expand overseas.</p>
                            <ul className="space-y-4">
                                {[
                                    "Global footprint across 60+ markets",
                                    "Deep local knowledge in Asia, Africa, and Middle East",
                                    "Innovative cross-border payment solutions",
                                    "Multi-currency account management"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#0066CC]" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-[#0066CC] p-10 rounded-3xl text-white">
                            <h2 className="text-2xl font-bold mb-6">Digital Banking for Business</h2>
                            <p className="mb-8 opacity-80 font-medium">Manage your corporate finances on the go with Straight2Bank Next Gen.</p>
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <ShieldCheck className="w-6 h-6 text-green-400 shrink-0" />
                                    <div>
                                        <h4 className="font-bold">Enhanced Security</h4>
                                        <p className="text-sm opacity-70">Biometric login and advanced encryption for all corporate transactions.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <BarChart3 className="w-6 h-6 text-blue-300 shrink-0" />
                                    <div>
                                        <h4 className="font-bold">Real-time Visibility</h4>
                                        <p className="text-sm opacity-70">Track cash flows and transactions across all your accounts globally.</p>
                                    </div>
                                </div>
                                <Link href="/auth/register" className="inline-block mt-4 bg-white text-[#0066CC] px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all">
                                    Get Started
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
