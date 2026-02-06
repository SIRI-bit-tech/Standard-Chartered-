'use client'

import { CreditCard, Send, FileText, Bitcoin, Headphones, TrendingUp } from 'lucide-react'
import { colors } from '@/types'

const services = [
  {
    icon: CreditCard,
    title: 'Multi-Currency Accounts',
    description: 'Hold and manage multiple currencies in one account'
  },
  {
    icon: Send,
    title: 'Global Transfers',
    description: 'Send money worldwide with competitive exchange rates'
  },
  {
    icon: FileText,
    title: 'Personal Loans',
    description: 'Flexible loan options with competitive interest rates'
  },
  {
    icon: Bitcoin,
    title: 'Crypto Assets',
    description: 'Buy, sell, and store cryptocurrencies securely'
  },
  {
    icon: Headphones,
    title: '24/7 Priority Support',
    description: 'Round-the-clock assistance for all your banking needs'
  },
  {
    icon: TrendingUp,
    title: 'Wealth Management',
    description: 'Expert guidance to grow and protect your wealth'
  }
]

export function Services() {
  return (
    <section className="py-12" style={{ backgroundColor: colors.backgroundSecondary }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.textPrimary }}>
            Our Financial Services
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Comprehensive solutions engineered for institutional agility and individual prosperity.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer border border-gray-100"
            >
              <div 
                className="w-14 h-14 rounded-lg flex items-center justify-center mb-6 transition-all group-hover:scale-110"
                style={{ backgroundColor: colors.primaryLight }}
              >
                <service.icon 
                  className="w-7 h-7"
                  style={{ color: colors.primary }}
                />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: colors.textPrimary }}>
                {service.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
