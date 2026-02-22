'use client'

import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Card } from '@/components/ui/card'
import { Leaf, Wind, Sun, ShieldCheck, ArrowRight, BarChart3, Users } from 'lucide-react'

export default function SustainabilityPage() {
    return (
        <div className="bg-[#FAFDFB] min-h-screen">
            <Header />
            <div className="pt-16">
                {/* Sustainability Header */}
                <div className="relative h-[650px] flex items-center justify-center overflow-hidden bg-green-950">
                    <img
                        src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80"
                        alt="Sustainable Future"
                        className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-950/40 to-green-950" />
                    <div className="relative z-10 max-w-5xl mx-auto text-center px-4 text-white">
                        <div className="inline-flex items-center gap-2 bg-green-500/20 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em] mb-8 border border-green-500/30">
                            <Leaf className="w-4 h-4 text-green-400" /> Building a Better Future
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black mb-8 leading-none tracking-tighter">Accelerating<br />the Transition.</h1>
                        <p className="text-xl md:text-2xl mb-12 opacity-90 font-medium max-w-3xl mx-auto leading-relaxed">
                            We are committed to reaching net zero in our own operations by 2025 and in our financed emissions by 2050.
                        </p>
                        <button className="bg-[#56B949] hover:bg-green-600 text-white px-12 py-5 rounded-full font-bold text-lg transition-all shadow-2xl shadow-green-900/40">Our Commitment</button>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-24">
                    {/* Three Pillars */}
                    <div className="text-center mb-24">
                        <h2 className="text-4xl font-black text-gray-900 mb-6">Our Three Strategic Pillars</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto font-medium">Focused on the areas where we can have the greatest impact through our unique network.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-24">
                        {[
                            { title: "Sustainable Finance", icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50", desc: "Mobilizing capital to support our clients' transition to net zero and funding green infrastructure." },
                            { title: "Responsible Business", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50", desc: "Setting the standard for transparency and ethical conduct across all our global operations." },
                            { title: "Inclusive Growth", icon: Users, color: "text-orange-600", bg: "bg-orange-50", desc: "Supporting financial inclusion and empowering communities through education and entrepreneurship." }
                        ].map((pill, i) => (
                            <Card key={i} className="p-12 border-none shadow-xl hover:shadow-2xl transition-all group rounded-[3rem]">
                                <div className={`${pill.bg} w-16 h-16 rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform`}>
                                    <pill.icon className={`${pill.color} w-8 h-8`} />
                                </div>
                                <h3 className="text-2xl font-bold mb-6">{pill.title}</h3>
                                <p className="text-gray-500 leading-relaxed font-medium mb-8">{pill.desc}</p>
                                <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-gray-900 cursor-pointer">
                                    Details <ArrowRight className="w-4 h-4 text-green-500" />
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Impact Numbers */}
                    <div className="bg-white rounded-[4rem] p-16 shadow-sm border border-green-100 flex flex-col md:flex-row gap-12 items-center mb-24">
                        <div className="flex-1">
                            <h2 className="text-4xl font-black mb-8 leading-tight text-gray-900">Measuring Our<br />Impact in 2024.</h2>
                            <p className="text-lg text-gray-500 leading-relaxed font-medium mb-10">
                                Transparency is key to our sustainability journey. We track our performance against rigorous global standards to ensure we are delivering on our promises.
                            </p>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center shrink-0"><Sun className="text-green-600 w-6 h-6" /></div>
                                    <p className="font-bold text-gray-800">85% Renewable energy used in our offices</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0"><Wind className="text-blue-600 w-6 h-6" /></div>
                                    <p className="font-bold text-gray-800">42GW Clean power projects financed</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center shrink-0"><Users className="text-orange-600 w-6 h-6" /></div>
                                    <p className="font-bold text-gray-800">5.2m Lives reached through community impact</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                            <div className="bg-[#FAFDFB] p-10 rounded-3xl border border-green-50 text-center">
                                <h4 className="text-5xl font-black text-green-700 mb-2">$300bn</h4>
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Target for Sustainable Finance</p>
                            </div>
                            <div className="bg-[#FAFDFB] p-10 rounded-3xl border border-green-50 text-center">
                                <h4 className="text-5xl font-black text-green-700 mb-2">62%</h4>
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Reduction in Scopes 1 & 2 Emissions</p>
                            </div>
                            <div className="bg-[#FAFDFB] p-10 rounded-3xl border border-green-50 text-center sm:col-span-2">
                                <h4 className="text-5xl font-black text-green-700 mb-2">AAA</h4>
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">MSCI ESG Rating for 5 consecutive years</p>
                            </div>
                        </div>
                    </div>

                    {/* Reports Download */}
                    <section className="bg-gray-900 rounded-[3rem] p-16 text-white text-center">
                        <h2 className="text-3xl font-bold mb-6">Our Sustainability Disclosures</h2>
                        <p className="text-white/60 mb-12 max-w-xl mx-auto font-medium">Read our detailed reports for 2024 covering ESG, TCFD, and our progress towards net-zero.</p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <button className="bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-3 rounded-xl font-bold transition-all text-sm flex items-center gap-2">Sustainability Report 2024 <ArrowRight className="w-4 h-4" /></button>
                            <button className="bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-3 rounded-xl font-bold transition-all text-sm flex items-center gap-2">ESG Data Book <ArrowRight className="w-4 h-4" /></button>
                            <button className="bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-3 rounded-xl font-bold transition-all text-sm flex items-center gap-2">TCFD Disclosure <ArrowRight className="w-4 h-4" /></button>
                        </div>
                    </section>
                </div>
            </div>
            <Footer />
        </div>
    )
}
