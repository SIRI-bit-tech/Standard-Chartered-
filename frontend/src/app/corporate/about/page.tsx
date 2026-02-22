'use client'

import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Leadership } from '@/components/landing/leadership'
import { Landmark, Users, Target, Award } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function AboutUsPage() {
    return (
        <div className="bg-white min-h-screen font-sans">
            <Header />
            <div className="pt-16">
                {/* Narrative Hero */}
                <div className="max-w-7xl mx-auto px-4 py-24">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 text-[#0066CC] font-bold text-sm tracking-widest uppercase mb-6">
                                <Landmark className="w-5 h-5" /> Our Heritage
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-8 leading-[1.1]">
                                Here for good,<br />Since 1853.
                            </h1>
                            <p className="text-xl text-gray-500 leading-relaxed mb-10 font-medium">
                                Standard Chartered is a leading international banking group, with a presence in 60 of the world's most dynamic markets. Our purpose is to drive commerce and prosperity through our unique diversity.
                            </p>
                            <div className="flex gap-12 border-t pt-10">
                                <div>
                                    <h4 className="text-4xl font-black text-[#0066CC]">60+</h4>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-tighter mt-1">Markets Worldwide</p>
                                </div>
                                <div>
                                    <h4 className="text-4xl font-black text-[#0066CC]">85k+</h4>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-tighter mt-1">Global Employees</p>
                                </div>
                                <div>
                                    <h4 className="text-4xl font-black text-[#0066CC]">160+</h4>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-tighter mt-1">Years of History</p>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl rotate-2">
                                <img
                                    src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80"
                                    className="w-full h-full object-cover"
                                    alt="Corporate HQ"
                                />
                            </div>
                            <div className="absolute -bottom-10 -left-10 bg-[#0066CC] text-white p-10 rounded-[2rem] shadow-2xl max-w-xs hidden md:block -rotate-3">
                                <p className="text-lg font-bold">"Our unique diversity and heritage underpin our commitment to our clients and the communities."</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Values Section */}
                <div className="bg-gray-50 py-24">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-20">
                            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Core Values</h2>
                            <p className="text-gray-500 max-w-2xl mx-auto font-medium">How we lead, how we work, and how we serve our clients every single day.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            {[
                                { icon: Target, title: "Ambitious", desc: "Setting the standard for excellence in international banking.", color: "text-blue-600", bg: "bg-blue-100" },
                                { icon: Users, title: "Inclusive", desc: "Embracing diversity and different perspectives to foster innovation.", color: "text-purple-600", bg: "bg-purple-100" },
                                { icon: Award, title: "Courageous", desc: "Speaking up and standing by our principles, even when it is difficult.", color: "text-orange-600", bg: "bg-orange-100" }
                            ].map((val, i) => (
                                <Card key={i} className="p-10 border-none shadow-xl hover:shadow-2xl transition-all text-center">
                                    <div className={`${val.bg} w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8`}>
                                        <val.icon className={`${val.color} w-10 h-10`} />
                                    </div>
                                    <h4 className="text-2xl font-bold mb-4">{val.title}</h4>
                                    <p className="text-gray-500 leading-relaxed">{val.desc}</p>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sustainability Teaser */}
                <div className="max-w-7xl mx-auto px-4 py-24">
                    <div className="bg-gray-900 rounded-[3rem] p-12 lg:p-20 text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full -mr-48 -mt-48" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                            <div>
                                <h2 className="text-4xl font-bold mb-8">Committed to Sustainability</h2>
                                <p className="text-xl opacity-70 mb-10 leading-relaxed font-light">
                                    We are using our global network and financial expertise to accelerate the transition to a net-zero world. We aim to reach net zero in our operations by 2025 and in our financed emissions by 2050.
                                </p>
                                <button className="bg-white text-gray-900 px-10 py-4 rounded-full font-bold hover:bg-gray-100 transition-all">Read our Sustainability Report</button>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                                    <h4 className="text-4xl font-bold mb-2">$300bn</h4>
                                    <p className="text-sm opacity-50 uppercase font-bold tracking-widest">In Sustainable Finance by 2030</p>
                                </div>
                                <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                                    <h4 className="text-4xl font-bold mb-2">Net Zero</h4>
                                    <p className="text-sm opacity-50 uppercase font-bold tracking-widest">In Operations by 2025</p>
                                </div>
                                <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                                    <h4 className="text-4xl font-bold mb-2">Top 1%</h4>
                                    <p className="text-sm opacity-50 uppercase font-bold tracking-widest">In ESG Global Ratings</p>
                                </div>
                                <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                                    <h4 className="text-4xl font-bold mb-2">Inclusive</h4>
                                    <p className="text-sm opacity-50 uppercase font-bold tracking-widest">Diverse Leadership representation</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Leadership />
            </div>
            <Footer />
        </div>
    )
}
