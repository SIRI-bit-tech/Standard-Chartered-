import React from "react"
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-white flex-col justify-between p-8">
        <div>
          <Link href="/" className="text-3xl font-bold">
            Standard Chartered
          </Link>
          <p className="mt-2 text-primary-50">Digital Banking Platform</p>
        </div>
        <div>
          <h2 className="text-4xl font-bold mb-4">Welcome to the Future of Banking</h2>
          <p className="text-lg text-primary-100 mb-8">
            Manage your finances securely with our state-of-the-art banking platform.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <span className="text-2xl">🔒</span>
              <div>
                <h3 className="font-semibold">Secure</h3>
                <p className="text-primary-100">Bank-grade security for your peace of mind</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-2xl">🌍</span>
              <div>
                <h3 className="font-semibold">Global</h3>
                <p className="text-primary-100">Multi-currency support for international transactions</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="font-semibold">Fast</h3>
                <p className="text-primary-100">Instant transfers and real-time updates</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
