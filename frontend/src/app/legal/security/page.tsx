import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Card } from '@/components/ui/card'
import { ShieldCheck, Lock, Smartphone, Globe, AlertTriangle, ShieldAlert, Cpu } from 'lucide-react'

export default function SecurityCompliancePage() {
    return (
        <div className="bg-white min-h-screen">
            <Header />
            <div className="pt-16">
                {/* Security Hero */}
                <div className="bg-[#0A0A0A] text-white py-24 border-b border-white/5">
                    <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-16">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 text-green-500 font-bold text-xs tracking-widest uppercase mb-6">
                                <ShieldCheck className="w-5 h-5" /> Bank-Grade Protection
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black mb-8 leading-none tracking-tighter">Your Security is<br />Our Priority.</h1>
                            <p className="text-xl opacity-60 mb-10 font-medium leading-relaxed max-w-xl">
                                We combine industry-leading encryption, real-time monitoring, and global compliance standards to keep your money and data safe.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <button className="bg-white text-black px-10 py-4 rounded-full font-bold hover:bg-gray-100 transition-all shadow-xl shadow-white/5">Report Fraud</button>
                                <button className="bg-white/10 text-white border border-white/20 px-10 py-4 rounded-full font-bold hover:bg-white/20 transition-all backdrop-blur-sm">Security Guide</button>
                            </div>
                        </div>
                        <div className="flex-1 relative py-10">
                            <div className="w-full aspect-square bg-[#0066CC]/20 blur-[120px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
                            <div className="relative z-10 grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-md">
                                    <Lock className="w-10 h-10 text-blue-400 mb-6" />
                                    <h4 className="font-bold text-lg mb-2">256-bit AES</h4>
                                    <p className="text-xs opacity-50">Military-grade encryption for all data at rest.</p>
                                </div>
                                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-md mt-12">
                                    <Smartphone className="w-10 h-10 text-green-400 mb-6" />
                                    <h4 className="font-bold text-lg mb-2">Biometrics</h4>
                                    <p className="text-xs opacity-50">Face ID & Touch ID integration for mobile.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-24">
                    {/* Protection Layers */}
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-black text-gray-900 mb-4">Multi-Layered Defense</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto font-medium">How we protect your account every second of every day.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
                        {[
                            { title: "Encryption", desc: "All communication between your device and our servers is encrypted using TLS 1.3 protocol, ensuring your data remains private.", icon: Cpu, color: "text-blue-600", bg: "bg-blue-50" },
                            { title: "AI Fraud Detection", desc: "Our advanced neural networks monitor millions of transactions daily to identify and block suspicious patterns instantly.", icon: Globe, color: "text-purple-600", bg: "bg-purple-50" },
                            { title: "2-Factor Auth", desc: "Additional security layer requiring a unique code from your trusted device for all sensitive account changes.", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50" }
                        ].map((layer, i) => (
                            <Card key={i} className="p-10 border-none shadow-sm hover:shadow-xl transition-all rounded-[3rem]">
                                <div className={`${layer.bg} w-16 h-16 rounded-2xl flex items-center justify-center mb-8`}>
                                    <layer.icon className={`${layer.color} w-8 h-8`} />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">{layer.title}</h3>
                                <p className="text-gray-500 leading-relaxed font-medium mb-8 text-sm">{layer.desc}</p>
                            </Card>
                        ))}
                    </div>

                    {/* User Safety Tips */}
                    <section className="bg-gray-50 rounded-[4rem] p-16 border border-gray-100 flex flex-col lg:flex-row gap-16 items-center mb-24">
                        <div className="flex-1">
                            <h2 className="text-4xl font-black text-gray-900 mb-8 leading-tight">Stay Vigilant.<br />Stay Safe.</h2>
                            <div className="space-y-6">
                                {[
                                    { title: "Avoid Phishing", desc: "We will never ask for your password or PIN via email or SMS.", icon: AlertTriangle, color: "text-orange-600" },
                                    { title: "Secure Network", desc: "Only access online banking from secure, private Wi-Fi networks.", icon: Globe, color: "text-blue-600" },
                                    { title: "Regular Updates", desc: "Keep your banking app and device OS up to date for latest security patches.", icon: Smartphone, color: "text-green-600" }
                                ].map((tip, i) => (
                                    <div key={i} className="flex gap-6 items-start p-6 bg-white rounded-3xl shadow-sm">
                                        <div className="p-3 bg-gray-50 rounded-2xl shrink-0"><tip.icon className={`${tip.color} w-6 h-6`} /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 mb-1">{tip.title}</h4>
                                            <p className="text-sm text-gray-500 font-medium">{tip.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 w-full lg:max-w-md">
                            <Card className="p-10 border-none bg-red-50 rounded-[3rem] relative overflow-hidden">
                                <ShieldAlert className="w-20 h-20 text-red-100 absolute -top-4 -right-4" />
                                <h4 className="text-2xl font-black text-red-900 mb-6 font-sans">Suspicious Activity?</h4>
                                <p className="text-red-800/70 mb-10 font-medium leading-relaxed">
                                    If you notice any unauthorized transactions or receive suspicious communications claiming to be from us, contact our 24/7 Security Hotline immediately.
                                </p>
                                <button className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-200">Call +44 (0) 20 7885 8888</button>
                                <button className="w-full mt-4 text-red-600 font-bold text-sm hover:underline">Report via Email</button>
                            </Card>
                        </div>
                    </section>

                    {/* Global Standards */}
                    <div className="text-center">
                        <h3 className="text-2xl font-black text-gray-900 mb-12 uppercase tracking-widest">Global Security Compliance</h3>
                        <div className="flex flex-wrap justify-center items-center gap-16 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e9/PCI_DSS_Logo.svg" className="h-10" alt="PCI DSS" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e3/ISO_9001_Logo.png" className="h-16" alt="ISO 9001" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Soc2_Logo.png" className="h-16" alt="SOC2" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/4/4c/GDPR_Logo.svg" className="h-12" alt="GDPR" />
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
