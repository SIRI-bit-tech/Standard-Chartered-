'use client'

import Link from 'next/link'
import Image from 'next/image'
import { colors } from '@/types'

export function Hero() {
  return (
    <section className="relative h-screen -mt-16">
      {/* Static background image - no animations */}
      <div className="absolute inset-0 pt-16">
        <Image
          src="/hero-1.jpg"
          alt="Hero Background"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex items-center justify-center h-full pt-20">
        <div className="text-center text-white px-4 max-w-4xl mx-auto">
          {/* Tag */}
          <div className="mb-4">
            <span 
              className="px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide"
              style={{ backgroundColor: colors.success }}
            >
              GLOBAL BANKING EXCELLENCE
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Empowering Your Global Financial Future
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl mb-8 text-gray-200 max-w-2xl mx-auto leading-relaxed">
            Secure, worldwide banking at your fingertips. Manage wealth, transfer funds, and grow assets with a partner that spans across 60 markets.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <button 
                className="px-8 py-4 rounded-lg font-semibold text-white transition-all transform hover:scale-105 shadow-lg"
                style={{ backgroundColor: colors.primary }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.primaryDark}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.primary}
              >
                Get Started Now
              </button>
            </Link>
            <Link href="#features">
              <button 
                className="px-8 py-4 rounded-lg font-semibold text-white transition-all transform hover:scale-105 shadow-lg border-2 border-white hover:bg-white hover:text-gray-900"
                style={{ backgroundColor: 'transparent' }}
              >
                View Wealth Solutions
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
