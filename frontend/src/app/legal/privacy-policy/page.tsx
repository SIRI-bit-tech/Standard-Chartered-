import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Card } from '@/components/ui/card'
import { Shield, Lock, Globe, FileText, UserCheck, Trash2 } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-white min-h-screen">
      <Header />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-8 md:p-12 border-none shadow-sm bg-gray-50/50 rounded-[2rem]">
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#0066CC] text-xs font-bold mb-4">
                <Shield className="w-3.5 h-3.5" /> GLOBAL PRIVACY STANDARDS
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-4 text-gray-900 leading-tight">Privacy Policy</h1>
              <p className="text-lg text-gray-500 font-medium">Standard Chartered Bank Group</p>
              <div className="flex flex-wrap gap-4 mt-6 text-sm text-gray-400 font-bold uppercase tracking-wider">
                <span>Last Updated: February 2026</span>
                <span className="text-gray-200">|</span>
                <span>Version 2.4</span>
              </div>
            </div>

            <div className="prose prose-blue max-w-none space-y-12">
              {/* Introduction */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Globe className="text-[#0066CC] w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 m-0">1. Introduction</h2>
                </div>
                <p className="text-gray-600 leading-relaxed font-medium">
                  Standard Chartered Bank ("we", "us" or "the Bank") is committed to protecting your privacy. This Global Privacy Policy explains how we collect, use, share, and protect your personal data across our footprint in Asia, Africa, and the Middle East.
                </p>
                <p className="text-gray-600 leading-relaxed font-medium">
                  This policy applies to all clients, employees, and third-party partners. By using our Platform or any of our banking services, you acknowledge the processing of your data as described herein.
                </p>
              </section>

              {/* Data Collection */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <FileText className="text-[#0066CC] w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 m-0">2. Information We Collect</h2>
                </div>
                <p className="text-gray-600 leading-relaxed font-medium mb-6">
                  We gather various types of personal data to offer our products and manage client relationships effectively:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-3">Core Identity Data</h4>
                    <ul className="space-y-2 text-sm text-gray-500 font-medium list-none p-0">
                      <li>• Full name and legal aliases</li>
                      <li>• Government-issued identification</li>
                      <li>• Date of birth and nationality</li>
                      <li>• Residential and tax residency details</li>
                    </ul>
                  </div>
                  <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-3">Technical & Digital Data</h4>
                    <ul className="space-y-2 text-sm text-gray-500 font-medium list-none p-0">
                      <li>• IP address and device identifiers</li>
                      <li>• Geolocation for fraud prevention</li>
                      <li>• Biometric data (for secure login)</li>
                      <li>• Cookies and session behavior</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Purpose */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <UserCheck className="text-[#0066CC] w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 m-0">3. Purpose of Processing</h2>
                </div>
                <div className="space-y-4 text-gray-600 font-medium">
                  <p>We process your data for the following essential purposes:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 list-none p-0">
                    <li>✓ Providing banking & wealth products</li>
                    <li>✓ Assessing eligibility & risk profiles</li>
                    <li>✓ Preventing financial crime & laundering</li>
                    <li>✓ Regulatory compliance & tax reporting</li>
                    <li>✓ Improving digital user experiences</li>
                    <li>✓ Enhancing platform security & stability</li>
                  </ul>
                </div>
              </section>

              {/* Data Sharing */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Lock className="text-[#0066CC] w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 m-0">4. Sharing and Cross-Border Transfers</h2>
                </div>
                <p className="text-gray-600 leading-relaxed font-medium mb-4">
                  As a global institution, your data may be shared within the Standard Chartered Group and with trusted service providers. This may involve transferring data to jurisdictions outside your country of residence.
                </p>
                <div className="p-6 bg-[#0066CC]/5 rounded-3xl border border-[#0066CC]/10">
                  <p className="text-sm text-[#0066CC] font-bold leading-relaxed m-0">
                    Strict information security standards are applied to all such transfers to ensure your data remains protected, regardless of where it is processed.
                  </p>
                </div>
              </section>

              {/* Retention and Rights */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Trash2 className="text-[#0066CC] w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 m-0">5. Retention and Individual Rights</h2>
                </div>
                <div className="space-y-6 text-gray-600 font-medium">
                  <p>
                    Generally, we retain personal data for <strong>seven years</strong> after your relationship with the Bank ends, or as mandated by local laws.
                  </p>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-4">
                    <p className="font-bold text-gray-900">Your Rights Include:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold uppercase tracking-tight text-center">
                      <div className="p-3 bg-gray-50 rounded-xl">Access & portability</div>
                      <div className="p-3 bg-gray-50 rounded-xl">Correction & deletion</div>
                      <div className="p-3 bg-gray-50 rounded-xl">Objection to marketing</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section>
                <div className="bg-gray-900 p-8 rounded-[2rem] text-white">
                  <h3 className="text-xl font-bold mb-4">Global Privacy Office</h3>
                  <p className="opacity-70 text-sm mb-6 leading-relaxed">
                    If you have questions about how your data is handled, please contact our Group Data Protection Officer.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                    <div>
                      <p className="text-xs font-bold text-blue-400 uppercase mb-1 underline decoration-2">Email Inquiries</p>
                      <p className="font-bold">privacy@sc.com</p>
                    </div>
                    <div className="hidden sm:block w-px h-8 bg-white/10" />
                    <div>
                      <p className="text-xs font-bold text-blue-400 uppercase mb-1 underline decoration-2">Postal Address</p>
                      <p className="font-bold">1 Basinghall Ave, London EC2V 5DD, UK</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  )
}
