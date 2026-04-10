'use client'

import { useState } from 'react'
import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Mail,ShieldCheck, Send, Loader2, HelpCircle, Search, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { useRef, useMemo } from 'react'

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showFaqs, setShowFaqs] = useState(false)
  const [faqSearch, setFaqSearch] = useState('')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const faqRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    subject: 'Wealth Management Inquiry',
    customSubject: '',
    message: ''
  })

  const faqs = [
    {
      category: "Security & Access",
      question: "How do I report a lost or stolen card?",
      answer: "If your card is lost, stolen, or you notice suspicious activity, please freeze it immediately via the 'Cards' section in your secure dashboard. For urgent replacement and security auditing, submit an inquiry using the 'Card Frozen / Security Issue' category. Our specialized fraud prevention team will conduct a comprehensive review of your recent transactions and initiate the issuance of a new, secure card within 24 hours."
    },
    {
      category: "Security & Access",
      question: "How can I reset my online banking password securely?",
      answer: "You can initiate a secure password reset from our login portal. For your protection, this process requires multi-factor authentication (MFA). If you have lost access to your primary authentication device or your account has been restricted for security reasons, please use the 'Password Reset / Login Help' option in our contact form. A security officer may contact you via your registered phone number to verify your identity before restoring full access."
    },
    {
      category: "Global Banking",
      question: "What are the specific requirements for offshore account setup?",
      answer: "Offshore account requirements vary significantly by jurisdiction (e.g., Singapore, UAE, or UK). Generally, we require certified copies of a valid passport, proof of residential address (utility bill or bank statement within the last 3 months), and comprehensive documentation regarding the source of funds and wealth. To receive a tailored requirements package for your specific financial objectives, please select 'Offshore Account Setup' from our inquiry menu."
    },
    {
      category: "Transfers & Payments",
      question: "How long do international wire transfers typically take?",
      answer: "Most international wire transfers are processed within 1 to 3 business days. However, the exact duration depends on several factors, including the destination country's banking infrastructure, intermediary correspondent banks, and standard compliance checks. You can monitor the real-time status of your transfer through the 'Transfers' section of your dashboard. If a transfer is delayed beyond 5 business days, our support team can initiate a formal trace with the correspondent network."
    },
    {
      category: "Account Management",
      question: "How do I update my primary contact or residential information?",
      answer: "To maintain the highest level of security for your assets, updates to sensitive profile information—such as your primary phone number, residential address, or legal name—require a formal verification process. You can submit these change requests through the 'Profile' section of your secure portal, where you may be asked to upload supporting documentation. This ensures that only authorized individuals can modify critical account recovery and communication channels."
    },
    {
      category: "Transfers & Payments",
      question: "What are the daily transfer limits and how can they be increased?",
      answer: "Daily transfer limits are established based on your account type, verification level, and historical transaction patterns to prevent unauthorized movement of funds. You can view your current limits on the transfer review screen. If your financial requirements necessitate a temporary or permanent limit increase, please contact your relationship manager or submit a 'Global Transfer Assistance' inquiry for a professional limit assessment."
    },
    {
      category: "Deposits & Investments",
      question: "How do I make a large deposit or initiate an investment?",
      answer: "For high-value deposits or specialized investment inquiries, we recommend coordinating with our treasury department. You can initiate a deposit from the 'Deposits' section of your dashboard, supporting both traditional wire transfers and digital asset settlements. For strategic wealth allocation or fixed-term deposit rates, please submit a 'Wealth Management' inquiry to speak with a dedicated investment advisor."
    },
    {
      category: "Account Management",
      question: "Where can I access my official bank statements and tax documents?",
      answer: "Official monthly statements, transaction receipts, and year-end tax certificates are available for secure download within the 'Accounts' section. Select your specific account and navigate to the 'Statements' tab to generate PDF documents. These statements are digitally signed and suitable for legal and tax verification purposes globally."
    },
    {
      category: "Corporate Banking",
      question: "Do you offer specialized solutions for corporate and institutional clients?",
      answer: "Yes, SCIB provides comprehensive corporate banking infrastructure, including multi-currency treasury management, trade finance, and institutional liquidity solutions. Our corporate portal supports multi-user authorization workflows and advanced API integration for seamless business operations. For a customized institutional proposal, please select 'Corporate Finance Assistance' from our contact form."
    }
  ]

  const filteredFaqs = useMemo(() => {
    const term = faqSearch.toLowerCase().trim()
    if (!term) return faqs
    return faqs.filter(f => 
      f.question.toLowerCase().includes(term) || 
      f.answer.toLowerCase().includes(term) ||
      f.category.toLowerCase().includes(term)
    )
  }, [faqSearch])

  const toggleFaqs = () => {
    setShowFaqs(!showFaqs)
    if (!showFaqs) {
      setTimeout(() => {
        faqRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }

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
        phone: formData.phone,
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
          phone: '',
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
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-5 py-4 bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none text-slate-900"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
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
                        Your data is protected by 256-bit military-grade encryption. We maintain strict privacy protocols for all global client interactions.
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

        {/* CTA & FAQ Section */}
        <section className="bg-slate-50 py-24 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-6">Need immediate answers?</h2>
              <p className="text-slate-500 text-lg font-light mb-12 max-w-2xl mx-auto">
                Explore our comprehensive knowledge base for expert insights on offshore wealth management, secure digital banking protocols, and international asset protection.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <button 
                  onClick={toggleFaqs}
                  className={`px-10 py-5 font-bold transition-all shadow-sm flex items-center gap-2 mx-auto ${
                    showFaqs 
                      ? 'bg-blue-600 text-white shadow-blue-200' 
                      : 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <HelpCircle className="h-5 w-5" />
                  {showFaqs ? 'Close Help Center' : 'Visit Help Center'}
                </button>
              </div>
            </div>

            {showFaqs && (
              <div 
                ref={faqRef}
                className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700"
              >
                {/* Search Bar */}
                <div className="relative mb-12">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search for security, transfers, account setup..."
                    className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all outline-none text-slate-900 shadow-sm"
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                  />
                </div>

                {/* FAQ Accordion */}
                <div className="space-y-4">
                  {filteredFaqs.map((faq, index) => (
                    <div 
                      key={index}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all hover:border-blue-200"
                    >
                      <button
                        onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                        className="w-full px-8 py-6 flex items-center justify-between text-left group"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-widest">
                            {faq.category}
                          </span>
                          <span className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {faq.question}
                          </span>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${openFaqIndex === index ? 'rotate-180 text-blue-600' : ''}`} />
                      </button>
                      
                      {openFaqIndex === index && (
                        <div className="px-8 pb-8 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="h-px bg-slate-100 mb-6" />
                          <p className="text-slate-600 leading-relaxed font-light text-lg">
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {filteredFaqs.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                      <HelpCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">No results found for "{faqSearch}". Please try another term or contact us directly.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
