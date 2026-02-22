'use client'

import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Card } from '@/components/ui/card'
import { Search, Filter, Newspaper, Share2, Download, ArrowRight, Bell } from 'lucide-react'

export default function PressReleasesPage() {
    const newsItems = [
        {
            date: "Feb 20, 2026",
            tag: "Financial Results",
            title: "Standard Chartered reports strong full-year performance with 10% income growth",
            summary: "Group announces record operating income and confirms 2026 strategic financial targets ahead of schedule."
        },
        {
            date: "Feb 18, 2026",
            tag: "Sustainability",
            title: "Bank commits further $50bn to sustainable infrastructure projects in emerging markets",
            summary: "New funding initiative aimed at accelerating the green transition in Asia and Africa through 2030."
        },
        {
            date: "Feb 15, 2026",
            tag: "Technology",
            title: "Standard Chartered partners with leading AI firm to revolutionize wealth management",
            summary: "Integration of advanced generative AI to provide personalized investment insights for global clients."
        },
        {
            date: "Feb 12, 2026",
            tag: "Awards",
            title: "Standard Chartered named 'Digital Bank of the Year' for third consecutive year",
            summary: "Excellence in mobile banking and customer experience recognized by international banking authority."
        }
    ]

    return (
        <div className="bg-white min-h-screen">
            <Header />
            <div className="pt-16">
                <div className="max-w-7xl mx-auto px-4 py-20">
                    <div className="flex flex-col lg:flex-row justify-between items-end gap-12 mb-16">
                        <div className="max-w-2xl">
                            <h1 className="text-5xl font-black text-gray-900 mb-6">Press Releases</h1>
                            <p className="text-xl text-gray-500 font-medium">
                                The latest news, announcements, and perspectives from Standard Chartered across the globe.
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 px-6 py-3 rounded-xl font-bold border border-border shadow-sm transition-all text-sm">
                                <Bell className="w-4 h-4 text-[#0066CC]" /> Subscribe to Alerts
                            </button>
                            <button className="flex items-center gap-2 bg-[#0066CC] hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all text-sm">
                                Media Contacts
                            </button>
                        </div>
                    </div>

                    {/* Search & Filter */}
                    <div className="bg-gray-50 p-4 rounded-2xl flex flex-col md:flex-row gap-4 mb-16 border border-border/50">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input type="text" placeholder="Search press releases..." className="w-full bg-white border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[#0066CC] outline-none font-medium" />
                        </div>
                        <div className="flex gap-4">
                            <select className="bg-white border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-[#0066CC]">
                                <option>All Categories</option>
                                <option>Financial Results</option>
                                <option>Sustainability</option>
                                <option>Technology</option>
                                <option>Leadership</option>
                            </select>
                            <select className="bg-white border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-[#0066CC]">
                                <option>2026</option>
                                <option>2025</option>
                                <option>2024</option>
                            </select>
                            <button className="bg-white p-3 rounded-xl border-none shadow-sm hover:bg-gray-100 transition-all">
                                <Filter className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Main News Area */}
                        <div className="lg:col-span-2 space-y-10">
                            {newsItems.map((news, i) => (
                                <div key={i} className="group cursor-pointer">
                                    <div className="flex items-center gap-4 text-xs font-bold mb-4">
                                        <span className="text-gray-400 tracking-widest uppercase">{news.date}</span>
                                        <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                        <span className="text-[#0066CC] bg-blue-50 px-2 py-0.5 rounded uppercase tracking-tighter">{news.tag}</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-[#0066CC] transition-colors leading-snug">
                                        {news.title}
                                    </h3>
                                    <p className="text-gray-500 leading-relaxed font-normal mb-6">
                                        {news.summary}
                                    </p>
                                    <div className="flex items-center gap-6">
                                        <button className="flex items-center gap-2 text-sm font-black text-gray-900 group-hover:gap-4 transition-all">
                                            Read Full Story <ArrowRight className="w-4 h-4 text-[#0066CC]" />
                                        </button>
                                        <div className="flex items-center gap-3">
                                            <Share2 className="w-4 h-4 text-gray-300 hover:text-[#0066CC] transition-colors" />
                                            <Download className="w-4 h-4 text-gray-300 hover:text-[#0066CC] transition-colors" />
                                        </div>
                                    </div>
                                    <hr className="mt-10 border-gray-100" />
                                </div>
                            ))}
                            <button className="w-full py-4 text-gray-400 font-bold hover:text-gray-900 transition-colors uppercase tracking-widest text-xs">Load More News</button>
                        </div>

                        {/* Sidebar Area */}
                        <div className="space-y-12">
                            <Card className="p-8 border-none bg-gray-900 text-white rounded-[2rem] shadow-2xl relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#0066CC] blur-[80px] rounded-full" />
                                <div className="relative z-10">
                                    <h4 className="text-xl font-bold mb-6">Media Information</h4>
                                    <p className="text-sm opacity-60 mb-8 leading-relaxed">Access our media kits, brand assets, and high-resolution leadership headshots.</p>
                                    <div className="space-y-4">
                                        <button className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white py-3 rounded-xl font-bold text-sm transition-all text-left px-6 flex justify-between items-center">
                                            Media Assets <Download className="w-4 h-4" />
                                        </button>
                                        <button className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white py-3 rounded-xl font-bold text-sm transition-all text-left px-6 flex justify-between items-center">
                                            Corporate History <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </Card>

                            <div>
                                <h4 className="text-lg font-bold text-gray-900 mb-6 px-1">Trending Topics</h4>
                                <div className="flex flex-wrap gap-2">
                                    {["Sustainability", "Strategy", "Fintech", "Middle East", "Net Zero", "Market Insights", "Wealth", "Crypto"].map((t, i) => (
                                        <span key={i} className="px-4 py-2 bg-gray-50 hover:bg-blue-50 hover:text-[#0066CC] transition-all rounded-full border border-border text-xs font-bold text-gray-500 cursor-pointer">{t}</span>
                                    ))}
                                </div>
                            </div>

                            <Card className="p-8 border-none bg-blue-50 rounded-[2rem]">
                                <Newspaper className="w-10 h-10 text-[#0066CC] mb-6" />
                                <h4 className="text-xl font-bold mb-4">Media Enquiries</h4>
                                <p className="text-sm text-gray-500 mb-6 leading-relaxed">For Journalists and media members only. Please visit our global contacts page for regional media teams.</p>
                                <button className="text-[#0066CC] font-bold text-sm hover:underline">Global Network Contacts</button>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
