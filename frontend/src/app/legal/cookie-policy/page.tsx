'use client'

import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Card } from '@/components/ui/card'
import { Shield, Info, Settings, MousePointer2 } from 'lucide-react'

export default function CookiePolicyPage() {
    const categories = [
        {
            title: "Strictly Necessary Cookies",
            desc: "These cookies are essential for the website to function and cannot be switched off. They are usually only set in response to actions made by you, such as logging in or filling in forms.",
            icon: Shield,
            color: "text-red-500",
            bg: "bg-red-50"
        },
        {
            title: "Performance Cookies",
            desc: "Used to collect information about how visitors use our website, for instance, which pages they visit most often. This helps us improve how our website works.",
            icon: Settings,
            color: "text-blue-500",
            bg: "bg-blue-50"
        },
        {
            title: "Functional Cookies",
            desc: "These cookies allow the website to remember choices you make (such as your user name, language, or the region you are in) and provide enhanced, more personal features.",
            icon: Info,
            color: "text-green-500",
            bg: "bg-green-50"
        },
        {
            title: "Targeting Cookies",
            desc: "These cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant ads on other sites.",
            icon: MousePointer2,
            color: "text-purple-500",
            bg: "bg-purple-50"
        }
    ]

    return (
        <div className="bg-gray-50 min-h-screen">
            <Header />
            <div className="pt-16 pb-16 px-4">
                <div className="max-w-4xl mx-auto py-16">
                    <div className="mb-12">
                        <h1 className="text-4xl font-black text-gray-900 mb-4">Cookie Policy</h1>
                        <p className="text-lg text-gray-500 leading-relaxed font-medium">
                            This policy explains how Standard Chartered uses cookies and similar technologies to recognize you when you visit our website.
                        </p>
                        <div className="flex items-center gap-4 mt-8">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Last Updated: Feb 20, 2026</span>
                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                            <span className="text-xs font-bold text-[#0066CC] uppercase tracking-widest cursor-pointer hover:underline">Download PDF</span>
                        </div>
                    </div>

                    <Card className="p-8 border-none shadow-sm mb-12">
                        <h2 className="text-xl font-extrabold mb-6">What are cookies?</h2>
                        <p className="text-gray-600 leading-relaxed font-medium mb-6">
                            Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.
                        </p>
                        <p className="text-gray-600 leading-relaxed font-medium">
                            Cookies set by the website owner (in this case, Standard Chartered) are called "first-party cookies". Cookies set by parties other than the website owner are called "third-party cookies".
                        </p>
                    </Card>

                    <h2 className="text-2xl font-black text-gray-900 mb-8">How we use cookies</h2>
                    <div className="space-y-6 mb-16">
                        {categories.map((cat, i) => (
                            <Card key={i} className="p-8 border-none shadow-sm flex flex-col md:flex-row gap-8 items-start">
                                <div className={`${cat.bg} p-6 rounded-3xl shrink-0`}>
                                    <cat.icon className={`${cat.color} w-8 h-8`} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-3">{cat.title}</h3>
                                    <p className="text-gray-500 leading-relaxed font-medium">{cat.desc}</p>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <section className="bg-white rounded-3xl p-10 border border-gray-100 mb-16">
                        <h2 className="text-2xl font-black mb-6">Managing your preferences</h2>
                        <p className="text-gray-600 leading-relaxed font-medium mb-8">
                            You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your preferences in the Cookie Consent Manager. The Cookie Consent Manager allows you to select which categories of cookies you accept or reject. Essential cookies cannot be rejected as they are strictly necessary to provide you with services.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button className="bg-[#0066CC] text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">Open Consent Manager</button>
                            <button className="bg-gray-100 text-gray-900 px-8 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all">Reject All Non-Essential</button>
                        </div>
                    </section>

                    <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100 flex items-start gap-4">
                        <Info className="text-blue-500 shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-blue-900 mb-2">Browser Controls</h4>
                            <p className="text-sm text-blue-800/70 leading-relaxed">
                                You can also set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website though your access to some functionality and areas of our website may be restricted.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
