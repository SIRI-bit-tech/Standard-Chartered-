'use client'

import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Card } from '@/components/ui/card'
import { BarChart3, PieChart, FileText, Calendar, TrendingUp, Download, ArrowUpRight } from 'lucide-react'

export default function InvestorRelationsPage() {
    return (
        <div className="bg-white min-h-screen">
            <Header />
            <div className="pt-16">
                {/* IR Header */}
                <div className="bg-gray-50 border-b">
                    <div className="max-w-7xl mx-auto px-4 py-16">
                        <div className="flex flex-col md:flex-row justify-between items-end gap-8">
                            <div className="max-w-2xl">
                                <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">Investor Relations</h1>
                                <p className="text-xl text-gray-500 font-medium">
                                    Transparent financial reporting, corporate governance, and updates for our global shareholder community.
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/50 flex items-center gap-6 min-w-[300px]">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Stock Price (LSE)</p>
                                    <h3 className="text-2xl font-black text-gray-900">742.60 <span className="text-green-500 text-sm">GBX</span></h3>
                                    <p className="text-sm font-bold text-green-500 mt-1 flex items-center gap-1">
                                        <TrendingUp className="w-4 h-4" /> +14.20 (1.95%)
                                    </p>
                                </div>
                                <div className="h-12 w-px bg-gray-100" />
                                <button className="text-[#0066CC] font-bold text-sm hover:underline">Full Chart</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-16">
                    {/* Quick Links */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
                        {[
                            { icon: FileText, title: "Annual Reports", desc: "View our latest integrated annual reports and strategic reviews." },
                            { icon: BarChart3, title: "Half Year Results", desc: "Financial performance updates for the first half of the year." },
                            { icon: PieChart, title: "Dividend Info", desc: "Current and historical dividend payment details for shareholders." },
                            { icon: Calendar, title: "Events & Webcasts", desc: "Watch live calls and browse materials from previous IR events." }
                        ].map((item, i) => (
                            <Card key={i} className="p-6 border-none shadow-sm hover:shadow-md transition-all group cursor-pointer">
                                <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#0066CC] transition-colors">
                                    <item.icon className="text-[#0066CC] group-hover:text-white transition-colors" />
                                </div>
                                <h4 className="font-bold text-lg mb-2">{item.title}</h4>
                                <p className="text-sm text-gray-500 mb-6">{item.desc}</p>
                                <div className="text-[#0066CC] text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    Learn More <ArrowUpRight className="w-4 h-4" />
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Financial Highlights */}
                    <div className="mb-20">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-2xl font-black text-gray-900">Financial Highlights</h2>
                            <button className="text-sm font-bold text-[#0066CC] flex items-center gap-2">View Data Portal <ArrowUpRight className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-[#0066CC] text-white p-10 rounded-3xl">
                                <p className="text-sm opacity-60 font-bold uppercase mb-2">Operating Income</p>
                                <h3 className="text-5xl font-black mb-4">$17.4bn</h3>
                                <p className="text-sm opacity-80">+10% constant currency growth for FY 2024</p>
                            </div>
                            <div className="bg-gray-100 p-10 rounded-3xl">
                                <p className="text-xs text-gray-400 font-bold uppercase mb-2">Profit Before Tax</p>
                                <h3 className="text-5xl font-black text-gray-900 mb-4">$5.7bn</h3>
                                <p className="text-sm text-gray-500">+13% compared to previous year</p>
                            </div>
                            <div className="bg-gray-100 p-10 rounded-3xl">
                                <p className="text-xs text-gray-400 font-bold uppercase mb-2">Return on Tangible Equity</p>
                                <h3 className="text-5xl font-black text-gray-900 mb-4">10.1%</h3>
                                <p className="text-sm text-gray-500">Target reached ahead of 2024 goal</p>
                            </div>
                        </div>
                    </div>

                    {/* Latest Documents */}
                    <section className="bg-gray-50 rounded-[3rem] p-12">
                        <h2 className="text-2xl font-black text-gray-900 mb-10">Latest Documents</h2>
                        <div className="space-y-4">
                            {[
                                { name: "Full Year 2024 Results Presentation", type: "PDF", size: "3.2 MB", date: "Feb 15, 2026" },
                                { name: "Annual Report and Accounts 2024", type: "PDF", size: "12.5 MB", date: "Feb 15, 2026" },
                                { name: "Strategic Update 2024 Webcast Transcript", type: "PDF", size: "840 KB", date: "Feb 16, 2026" },
                                { name: "Pillar 3 Disclosures Full Year 2024", type: "PDF", size: "4.1 MB", date: "Feb 15, 2026" }
                            ].map((doc, i) => (
                                <div key={i} className="bg-white p-6 rounded-2xl flex items-center justify-between border border-border/50 hover:border-[#0066CC] transition-all cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-red-50 p-3 rounded-lg text-red-600 font-bold text-xs">{doc.type}</div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 group-hover:text-[#0066CC] transition-colors">{doc.name}</h4>
                                            <p className="text-xs text-gray-400 mt-1 font-medium">{doc.date} • {doc.size}</p>
                                        </div>
                                    </div>
                                    <Download className="text-gray-300 group-hover:text-[#0066CC] transition-colors" />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
            <Footer />
        </div>
    )
}
