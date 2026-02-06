'use client'

import { Shield, Building, Clock, Globe } from 'lucide-react'
import { colors } from '@/types'

const features = [
  {
    icon: Shield,
    title: 'Bank-level SSL',
    description: 'Enterprise-grade security for all your transactions'
  },
  {
    icon: Building,
    title: 'FDIC Insured',
    description: 'Your deposits are protected up to $250,000'
  },
  {
    icon: Clock,
    title: '50+ Years',
    description: 'Decades of trusted financial expertise'
  },
  {
    icon: Globe,
    title: 'Global Regulation',
    description: 'Fully licensed and regulated worldwide'
  }
]

export function Features() {
  return (
    <section className="py-8 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center group">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all group-hover:scale-110"
                style={{ backgroundColor: colors.primaryLight }}
              >
                <feature.icon 
                  className="w-8 h-8 transition-colors"
                  style={{ color: colors.primary }}
                />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textPrimary }}>
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
