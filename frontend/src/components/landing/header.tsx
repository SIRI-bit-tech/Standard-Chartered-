'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { colors } from '@/types'

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <img
                src="/logo.png"
                alt="Standard Chartered"
                className="h-12 w-auto cursor-pointer"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/banking/personal" className="text-gray-700 hover:text-gray-900 transition-colors">
              Personal
            </Link>
            <Link href="/banking/business" className="text-gray-700 hover:text-gray-900 transition-colors">
              Business
            </Link>
            <Link href="/corporate/about" className="text-gray-700 hover:text-gray-900 transition-colors">
              About Us
            </Link>
          </nav>

          {/* Search and Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/auth/login">
              <button className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors">
                Sign In
              </button>
            </Link>
            <Link href="/auth/register">
              <button
                className="px-4 py-2 text-white rounded-lg transition-colors"
                style={{ backgroundColor: colors.primary }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.primaryDark}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.primary}
              >
                Open Account
              </button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link href="/banking/personal" className="block px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md">
                Personal
              </Link>
              <Link href="/banking/business" className="block px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md">
                Business
              </Link>
              <Link href="/corporate/about" className="block px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md">
                About Us
              </Link>
              <div className="pt-2 space-y-2">
                <Link href="/auth/login">
                  <button className="w-full px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md text-left">
                    Sign In
                  </button>
                </Link>
                <Link href="/auth/register">
                  <button
                    className="w-full px-3 py-2 text-white rounded-md"
                    style={{ backgroundColor: colors.primary }}
                  >
                    Open Account
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
