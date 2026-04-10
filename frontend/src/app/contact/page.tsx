'use client'

import { useState } from 'react'
import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Mail,ShieldCheck, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: 'Wealth Management Inquiry',
    customSubject: '',
    message: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation check since user might have missed fields above the fold
    if (!formData.fullName || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields.")
      return
    }

    setIsSubmitting(true)

    try {
      const submissionData = {
        fullName: formData.fullName,
        email: formData.email,
        message: formData.message,
        subject: formData.subject === 'Other' ? formData.customSubject : formData.subject
      }
      
      const response = await apiClient.post<{ success: boolean; message: string }>('/api/v1/support/contact', submissionData)
      
      if (response.success) {
        toast.success("Message Sent Successfully", {
          description: response.message || "Our specialized global support team will contact you within 24 hours.",
        })
        setFormData({
          fullName: '',
          email: '',
          subject: 'Wealth Management Inquiry',
          customSubject: '',
          message: ''
        })
      } else {
        throw new Error('Submission failed')
      }
    } catch (error: any) {
      console.error('Contact form error:', error)
      const errorMsg = error.response?.data?.detail || "Failed to send message. Please try again later."
      toast.error("Error", {
        description: errorMsg
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 bg-slate-900 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl">
              <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase mb-4 py-1 px-3 bg-green-500/10 text-green-400 rounded-sm">
                Global Support Center
              </span>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-[1.1]">
                Get in Touch with Our <br />
                <span className="text-blue-400">Expert Advisors</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl font-light">
                Expert financial guidance is only a conversation away. Reach out to our 
                specialized global teams for dedicated support in wealth management and international banking.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="bg-white py-24 relative z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
              
              {/* Form Section */}
              <div className="lg:col-span-7">
                <div className="mb-12">
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Send a Message</h2>
                  <p className="text-slate-500 text-lg font-light">
                    Complete the form below and an advisor will contact you within 24 hours.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Full Name</label>
                      <input
                        required
                        type="text"
                        placeholder="John Doe"
                        className="w-full px-5 py-4 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none text-slate-900"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email Address</label>
                      <input
                        required
                        type="email"
                        placeholder="john@example.com"
                        className="w-full px-5 py-4 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none text-slate-900"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Subject</label>
                    <div className="relative">
                      <select
                        className="w-full px-5 py-4 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none text-slate-900 appearance-none cursor-pointer"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      >
                        <option>Wealth Management Inquiry</option>
                        <option>Global Banking Solutions</option>
                        <option>Offshore Account Setup</option>
                        <option>Corporate Finance Assistance</option>
                        <option>Account Restricted</option>
                        <option>Card Frozen / Security Issue</option>
                        <option>Loans & Mortgages</option>
                        <option>Bill Payment Issue</option>
                        <option>Password Reset / Login Help</option>
                        <option>Other</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  {formData.subject === 'Other' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Specify Subject</label>
                      <input
                        required
                        type="text"
                        placeholder="Please enter your inquiry subject"
                        className="w-full px-5 py-4 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none text-slate-900"
                        value={formData.customSubject}
                        onChange={(e) => setFormData({ ...formData, customSubject: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Message</label>
                    <textarea
                      required
                      rows={6}
                      placeholder="How can we assist you today?"
                      className="w-full px-5 py-4 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none text-slate-900 resize-none"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="group px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all flex items-center gap-3 shadow-[0_20px_40px_-15px_rgba(37,99,235,0.4)]"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Send Message
                        <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Info Section */}
              <div className="lg:col-span-5 space-y-12 lg:pl-10">
                <div className="bg-slate-900 p-10 text-white shadow-2xl">
                  <div className="flex gap-5 items-start mb-6">
                    <div className="p-3 bg-white/10 text-blue-400">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">Secure Communication</h3>
                      <p className="text-sm text-gray-400 font-light leading-relaxed">
                        Your data is protected by 256-bit military-grade encryption. We never share your personal information.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-10">
                  <h3 className="text-2xl font-bold text-slate-900">Direct Channels</h3>
                  
                  <div className="space-y-8">
                    <div className="flex gap-6 items-center">
                      <div className="w-14 h-14 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full">
                        <Mail className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 block mb-1">
                          Priority Support
                        </span>
                        <p className="text-xl font-bold text-slate-900 break-all">support@standardcharteredibank.com</p>
                      </div>
                    </div>

                    <div className="flex gap-6 items-center">
                      <div className="w-14 h-14 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full">
                        <Mail className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 block mb-1">
                          Inquiry Email
                        </span>
                        <p className="text-xl font-bold text-slate-900 break-all">info@standardcharteredibank.com</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-12 border-t border-slate-100">
                  <h3 className="font-bold text-slate-900 mb-6">Strategic Financial Partners</h3>
                  <div className="flex flex-wrap gap-3">
                    {['Global Banking', 'Wealth Management', 'Asset Protection', 'Offshore Solutions'].map((tag) => (
                      <span key={tag} className="px-4 py-2 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-slate-50 py-24">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">Need immediate answers?</h2>
            <p className="text-slate-500 text-lg font-light mb-12 max-w-2xl mx-auto">
              Browse our comprehensive help center for guides on digital banking, personal loans, and account management.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button className="px-10 py-5 bg-white text-slate-900 font-bold border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                Visit Help Center
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
