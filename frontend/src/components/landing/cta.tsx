'use client'

import { colors } from '@/types'
import Link from 'next/link'

export function CTA() {
  return (
    <section className="py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="rounded-2xl p-10 text-center"
          style={{ backgroundColor: colors.primary }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join millions of clients who trust us with their financial journey. Opening an account takes less than 5 minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <button
                className="w-full sm:w-auto px-8 py-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                style={{ backgroundColor: colors.white, color: colors.primary }}
              >
                Open Account Today
              </button>
            </Link>
            <Link href="/banking/business">
              <button
                className="w-full sm:w-auto px-8 py-4 rounded-lg font-semibold text-white border-2 border-white transition-all transform hover:scale-105 hover:bg-white hover:text-gray-900"
                style={{ backgroundColor: 'transparent' }}
              >
                Explore Business Banking
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
