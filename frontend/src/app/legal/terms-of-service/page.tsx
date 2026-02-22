import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Card } from '@/components/ui/card'
import { FileText, ShieldAlert, Scale, CreditCard, Laptop, AlertCircle } from 'lucide-react'

export default function TermsOfServicePage() {
  return (
    <div className="bg-white min-h-screen">
      <Header />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-8 md:p-12 border-none shadow-sm bg-gray-50/50 rounded-[2rem]">
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#0066CC] text-xs font-bold mb-4">
                <Scale className="w-3.5 h-3.5" /> LEGALLY BINDING AGREEMENT
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-4 text-gray-900 leading-tight">Terms of Service</h1>
              <p className="text-lg text-gray-500 font-medium">Standard Chartered Bank Global Banking Conditions</p>
              <div className="flex flex-wrap gap-4 mt-6 text-sm text-gray-400 font-bold uppercase tracking-wider">
                <span>Revised: February 2026</span>
                <span className="text-gray-200">|</span>
                <span>Document Ref: GBC-V.04</span>
              </div>
            </div>

            <div className="prose prose-blue max-w-none space-y-12">
              {/* General Terms */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <FileText className="text-[#0066CC] w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 m-0">1. General Banking Terms</h2>
                </div>
                <p className="text-gray-600 leading-relaxed font-medium">
                  These General Banking Terms and Conditions apply when you use any Standard Chartered Bank account, product, or service. They form a binding agreement between you and the Bank. We reserve the right to amend these terms at any time with prior notice.
                </p>
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 mt-6">
                  <p className="text-sm text-gray-500 m-0 leading-relaxed font-medium">
                    "General Conditions" means these terms as supplemented by the specific terms of each account and service. In case of conflict, the specific product terms shall prevail.
                  </p>
                </div>
              </section>

              {/* Electronic Banking */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Laptop className="text-[#0066CC] w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 m-0">2. Electronic Banking Services</h2>
                </div>
                <p className="text-gray-600 leading-relaxed font-medium mb-6">
                  Our digital platform allows you to manage accounts, execute transfers, and access financial markets globally. Access is governed by strict security protocols:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-xs font-bold text-gray-600 m-0">You are responsible for keeping all security codes, PINs, and biometric data confidential.</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-xs font-bold text-gray-600 m-0">Online transactions carry inherent risks; the Bank is not liable for losses due to user negligence.</p>
                  </div>
                </div>
              </section>

              {/* Regulatory Compliance */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Scale className="text-[#0066CC] w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 m-0">3. Regulatory Compliance</h2>
                </div>
                <p className="text-gray-600 leading-relaxed font-medium">
                  We operate in compliance with international standards, including the UK Banking Act and global AML (Anti-Money Laundering) requirements. We are obligated to report suspicious activity to relevant authorities and may freeze accounts pending investigation.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-500 font-bold list-none p-0">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> No service will be provided in violation of international sanctions.</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> Tax reporting is conducted in adherence with CRS and FATCA standards.</li>
                </ul>
              </section>

              {/* Payments & Fees */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <CreditCard className="text-[#0066CC] w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 m-0">4. Payments and Tariffs</h2>
                </div>
                <div className="space-y-4 text-gray-600 font-medium">
                  <p>
                    All payments must be made in the currency specified for the product. Fees and charges are outlined in our <strong>Client Tariff Booklet</strong>, available on our website and at any branch.
                  </p>
                  <p>
                    Currency conversion for international transfers is executed at the prevailing Bank rate at the time of processing, which includes a standard service margin.
                  </p>
                </div>
              </section>

              {/* Limitation of Liability */}
              <section>
                <div className="bg-gray-900 p-8 rounded-[2rem] text-white">
                  <h3 className="text-xl font-bold mb-4">Limitation of Liability</h3>
                  <p className="opacity-70 text-sm mb-6 leading-relaxed">
                    To the maximum extent permitted by law, the Bank is not liable for indirect, consequential, or punitive damages arising from the use or inability to use our services, unless caused by our gross negligence or willful misconduct.
                  </p>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-xs font-bold leading-relaxed m-0 italic">
                      "I have read, understood, and agree to the General Banking Terms and Conditions."
                    </p>
                  </div>
                </div>
              </section>

              {/* Contact Information */}
              <section className="text-center pt-8 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Need Legal Clarification?</p>
                <p className="font-bold text-gray-900">legal@sc.com</p>
                <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                  Standard Chartered Bank is authorized by the Prudential Regulation Authority and regulated by the Financial Conduct Authority and the Prudential Regulation Authority.
                </p>
              </section>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  )
}
