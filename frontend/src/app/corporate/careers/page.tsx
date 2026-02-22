'use client'

import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Card } from '@/components/ui/card'
import { Globe, Heart, ArrowRight, Sparkles } from 'lucide-react'

export default function CareersPage() {
    return (
        <div className="bg-white min-h-screen">
            <Header />
            <div className="pt-16">
                {/* Careers Hero */}
                <div className="relative h-[650px] flex items-center justify-start overflow-hidden bg-gray-900">
                    <img
                        src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80"
                        alt="Team collaboration"
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                    />
                    <div className="relative z-10 max-w-7xl mx-auto px-4 w-full">
                        <div className="max-w-2xl bg-white/10 backdrop-blur-xl p-12 rounded-[3rem] border border-white/20 text-white shadow-2xl">
                            <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight">Start your<br />journey with us</h1>
                            <p className="text-xl opacity-90 mb-10 font-medium">
                                We're a bank with a uniquely powerful purpose. Discover how you can build a meaningful career in a diverse and inclusive environment.
                            </p>
                            <div className="flex gap-4">
                                <button className="bg-[#0066CC] hover:bg-blue-600 px-10 py-4 rounded-full font-bold shadow-lg shadow-blue-500/30 transition-all">Search Jobs</button>
                                <button className="bg-white text-gray-900 hover:bg-gray-100 px-10 py-4 rounded-full font-bold transition-all">Early Careers</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-24">
                    {/* Why SC Section */}
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-bold mb-4">Why Standard Chartered?</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto font-medium">We offer more than just a job. We provide a platform for growth, impact, and belonging.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-24">
                        <div className="space-y-6">
                            <div className="bg-blue-50 w-16 h-16 rounded-3xl flex items-center justify-center">
                                <Globe className="text-[#0066CC] w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold">Unrivalled Network</h3>
                            <p className="text-gray-500 leading-relaxed font-medium">Work across 60 markets and bridge the gap between East and West. Your career can take you anywhere.</p>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-purple-50 w-16 h-16 rounded-3xl flex items-center justify-center">
                                <Heart className="text-purple-600 w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold">Inclusive Culture</h3>
                            <p className="text-gray-500 leading-relaxed font-medium">We value your unique perspective. Our diverse workforce is our greatest strength and source of innovation.</p>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-orange-50 w-16 h-16 rounded-3xl flex items-center justify-center">
                                <Sparkles className="text-orange-600 w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold">Learning & Growth</h3>
                            <p className="text-gray-500 leading-relaxed font-medium">Continuous development through our world-class training programs and mentorship opportunities.</p>
                        </div>
                    </div>

                    {/* Opportunity Tracks */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-24">
                        <Card className="group overflow-hidden border-none shadow-2xl rounded-[3rem]">
                            <div className="relative h-80 overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Professionals" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0066CC] to-transparent opacity-60" />
                                <div className="absolute bottom-8 left-8 text-white">
                                    <h3 className="text-3xl font-black mb-2">Experienced Professionals</h3>
                                    <p className="opacity-90 font-medium">Take the next step in your expert journey.</p>
                                </div>
                            </div>
                            <div className="p-10 bg-white">
                                <p className="text-gray-500 mb-8 font-medium">We are looking for leaders and specialists in wealth management, global banking, technology, and operations.</p>
                                <button className="flex items-center gap-2 font-black text-[#0066CC] group/btn">
                                    Explore Professional Roles <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
                                </button>
                            </div>
                        </Card>

                        <Card className="group overflow-hidden border-none shadow-2xl rounded-[3rem]">
                            <div className="relative h-80 overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Early Careers" />
                                <div className="absolute inset-0 bg-gradient-to-t from-green-600 to-transparent opacity-60" />
                                <div className="absolute bottom-8 left-8 text-white">
                                    <h3 className="text-3xl font-black mb-2">Early Careers</h3>
                                    <p className="opacity-90 font-medium">Graduates, interns, and apprentices.</p>
                                </div>
                            </div>
                            <div className="p-10 bg-white">
                                <p className="text-gray-500 mb-8 font-medium">Launch your career with an industry-leading program designed to accelerate your development and network.</p>
                                <button className="flex items-center gap-2 font-black text-green-600 group/btn">
                                    Explore Early Career Programs <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
                                </button>
                            </div>
                        </Card>
                    </div>

                    {/* DEI Section */}
                    <section className="bg-gray-50 rounded-[3rem] p-16 flex flex-col md:flex-row gap-16 items-center">
                        <div className="flex-1">
                            <h2 className="text-4xl font-black mb-6">Diversity, Equity & Inclusion</h2>
                            <p className="text-lg text-gray-600 leading-relaxed font-medium mb-8">
                                We believe that a diverse and inclusive workforce is essential to our success. We are committed to creating an environment where everyone can flourish, regardless of their background or identity.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 font-bold text-center">
                                    <p className="text-2xl text-[#0066CC] mb-1">125+</p>
                                    <p className="text-xs text-gray-400 uppercase">Nationalities</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 font-bold text-center">
                                    <p className="text-2xl text-[#0066CC] mb-1">33%</p>
                                    <p className="text-xs text-gray-400 uppercase">Women in Sr Leadership</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 rounded-[2rem] overflow-hidden shadow-2xl">
                            <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover" alt="DEI" />
                        </div>
                    </section>
                </div>
            </div>
            <Footer />
        </div>
    )
}
