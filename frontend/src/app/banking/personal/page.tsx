import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Card } from '@/components/ui/card'
import { ShieldCheck, ArrowRight, User, PieChart, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function PersonalBankingPage() {
    return (
        <div className="bg-gray-50 min-h-screen">
            <Header />
            <div className="pt-16">
                {/* Hero Section */}
                <div className="bg-[#0066CC] text-white py-20 px-4">
                    <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">Personal Banking</h1>
                        <p className="text-xl opacity-90 max-w-2xl">
                            Helping you to manage your daily finances and plan for your future with ease and security.
                        </p>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-16">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                        <Card className="p-8 border-none shadow-xl hover:shadow-2xl transition-all">
                            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                                <User className="text-[#0066CC]" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Accounts</h3>
                            <p className="text-gray-600 mb-6">Range of savings and current accounts designed to suit your lifestyle.</p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-2 text-sm">
                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                    Zero monthly fees for qualified users
                                </li>
                                <li className="flex items-center gap-2 text-sm">
                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                    Global access with multi-currency options
                                </li>
                            </ul>
                            <Link href="/auth/register" className="text-[#0066CC] font-bold flex items-center gap-2 hover:gap-3 transition-all">
                                Learn More <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Card>

                        <Card className="p-8 border-none shadow-xl hover:shadow-2xl transition-all">
                            <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                                <PieChart className="text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Wealth Management</h3>
                            <p className="text-gray-600 mb-6">Smart investments and expert advice to help grow your assets sustainably.</p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-2 text-sm">
                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                    Personalized investment portfolios
                                </li>
                                <li className="flex items-center gap-2 text-sm">
                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                    Dedicated wealth advisors
                                </li>
                            </ul>
                            <Link href="/auth/register" className="text-[#0066CC] font-bold flex items-center gap-2 hover:gap-3 transition-all">
                                Learn More <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Card>

                        <Card className="p-8 border-none shadow-xl hover:shadow-2xl transition-all">
                            <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                                <Sparkles className="text-orange-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Digital Services</h3>
                            <p className="text-gray-600 mb-6">Bank anytime, anywhere with our award-winning mobile and online platform.</p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-2 text-sm">
                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                    24/7 online and mobile banking
                                </li>
                                <li className="flex items-center gap-2 text-sm">
                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                    Instant local and international transfers
                                </li>
                            </ul>
                            <Link href="/auth/register" className="text-[#0066CC] font-bold flex items-center gap-2 hover:gap-3 transition-all">
                                Learn More <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Card>
                    </div>

                    <section className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="text-3xl font-bold mb-6">Why Personal Banking with us?</h2>
                                <p className="text-gray-600 mb-8 leading-relaxed">
                                    Standard Chartered is more than just a bank. We are your partner in financial growth. With over 160 years of experience, we've helped millions of people achieve their financial goals.
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-blue-50 p-2 rounded-full">
                                            <ShieldCheck className="w-5 h-5 text-[#0066CC]" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold">Safe & Secure</h4>
                                            <p className="text-sm text-gray-500">Industry-leading multi-layered security protocols to protect your data.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="bg-blue-50 p-2 rounded-full">
                                            <ShieldCheck className="w-5 h-5 text-[#0066CC]" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold">Global Presence</h4>
                                            <p className="text-sm text-gray-500">Access your money in over 60 markets across Asia, Africa, and the Middle East.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="relative h-80 lg:h-full bg-blue-50 rounded-2xl flex items-center justify-center overflow-hidden">
                                <img
                                    src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                                    alt="Personal Banking"
                                    className="object-cover w-full h-full opacity-80"
                                />
                            </div>
                        </div>
                    </section>
                </div>
            </div>
            <Footer />
        </div>
    )
}
