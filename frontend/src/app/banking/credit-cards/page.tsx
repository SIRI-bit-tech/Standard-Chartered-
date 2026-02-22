import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Card } from '@/components/ui/card'
import { Gift, Plane, Star, ShieldCheck, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

export default function CreditCardsPage() {
    const cards = [
        {
            name: "Simply Cash Card",
            desc: "Earn unlimited cashback on every spend, anywhere.",
            features: ["1.5% cashback on all spends", "No minimum spend", "No cashback cap"],
            color: "from-blue-600 to-indigo-700",
            icon: Gift
        },
        {
            name: "Journey Credit Card",
            desc: "Travel in style with miles that never expire.",
            features: ["3 miles per $1 overseas", "Priority Pass access", "Travel insurance included"],
            color: "from-amber-500 to-orange-600",
            icon: Plane
        },
        {
            name: "Smart Card",
            desc: "The smart way to shop and save on daily essentials.",
            features: ["6% cashback at top merchants", "Annual fee waiver", "0% interest on big purchases"],
            color: "from-green-500 to-teal-600",
            icon: ShoppingCart
        }
    ]

    return (
        <div className="bg-gray-50 min-h-screen">
            <Header />
            <div className="pt-16">
                <div className="bg-gradient-to-r from-[#0066CC] to-blue-800 text-white py-24 px-4">
                    <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
                        <span className="bg-white/20 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4">Compare & Choose</span>
                        <h1 className="text-4xl md:text-6xl font-extrabold mb-6">Credit Cards</h1>
                        <p className="text-xl opacity-90 max-w-2xl font-medium">
                            Discover a range of cards that reward your lifestyle, from travel perks to daily cashback.
                        </p>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 -mt-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                        {cards.map((card, i) => (
                            <Card key={i} className="group overflow-hidden border-none shadow-2xl hover:-translate-y-2 transition-all duration-300">
                                <div className={`bg-gradient-to-br ${card.color} p-12 text-white relative`}>
                                    <card.icon className="absolute top-4 right-4 w-12 h-12 opacity-20" />
                                    <h3 className="text-2xl font-bold mb-2">{card.name}</h3>
                                    <p className="text-sm opacity-90 mb-6">{card.desc}</p>
                                    <div className="flex items-center gap-2 text-sm font-bold bg-white/10 w-fit px-3 py-1 rounded-full border border-white/20">
                                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Premium Rewards
                                    </div>
                                </div>
                                <div className="p-8 bg-white">
                                    <ul className="space-y-4 mb-8">
                                        {card.features.map((f, fi) => (
                                            <li key={fi} className="flex items-center gap-3 text-sm text-gray-600">
                                                <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link href="/auth/register" className="block w-full text-center py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all">
                                        Apply Now
                                    </Link>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <div className="bg-white rounded-[2rem] p-12 shadow-sm border border-gray-100 mb-20 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                            <div>
                                <h2 className="text-3xl font-bold mb-6">Global Safety & Control</h2>
                                <p className="text-gray-600 mb-8 leading-relaxed font-medium">
                                    Our cards come with industry-standard security features and complete control through our mobile app.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {[
                                        { title: "Instant Lock", desc: "Freeze your card instantly if lost." },
                                        { title: "Spend Alerts", desc: "Real-time notifications for every cent." },
                                        { title: "Secure Pay", desc: "Contactless and mobile wallet support." },
                                        { title: "24/7 Support", desc: "Global assistance whenever you need it." }
                                    ].map((item, i) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                                <ShieldCheck className="w-5 h-5 text-[#0066CC]" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm">{item.title}</h4>
                                                <p className="text-xs text-gray-500">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-8 flex items-center justify-center">
                                <img
                                    src="https://images.unsplash.com/photo-1542462014-d29af3025848?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                                    alt="Secure Payments"
                                    className="rounded-xl shadow-lg rotate-3 hover:rotate-0 transition-transform duration-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
