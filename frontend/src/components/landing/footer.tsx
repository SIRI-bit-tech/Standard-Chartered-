'use client'

// import { Facebook, Twitter, Linkedin, Instagram, Youtube } from 'lucide-react'
import { colors } from '@/types'
import Link from 'next/link'
import Image from 'next/image'

// const socialLinks = [
//   { icon: Facebook, href: '#' },
//   { icon: Twitter, href: '#' },
//   { icon: Linkedin, href: '#' },
//   { icon: Instagram, href: '#' },
//   { icon: Youtube, href: '#' }
// ]

const footerLinks = {
  banking: [
    { name: 'Personal Banking', href: '/banking/personal' },
    { name: 'Business Banking', href: '/banking/business' },
    { name: 'Credit Cards', href: '/banking/credit-cards' },
    { name: 'Loans', href: '/banking/loans' },
    { name: 'Mortgages', href: '/banking/mortgages' }
  ],
  corporate: [
    { name: 'About Us', href: '/corporate/about' },
    { name: 'Investor Relations', href: '/corporate/investor-relations' },
    { name: 'Careers', href: '/corporate/careers' },
    { name: 'Press Releases', href: '/corporate/press-releases' },
    { name: 'Sustainability', href: '/corporate/sustainability' }
  ],
  legal: [
    { name: 'Privacy Policy', href: '/legal/privacy-policy' },
    { name: 'Terms of Service', href: '/legal/terms-of-service' },
    { name: 'Cookie Policy', href: '/legal/cookie-policy' },
    { name: 'Security', href: '/legal/security' }
  ],
  contact: [
    { name: 'Support Email', href: 'mailto:support@standardcharteredibank.com' },
    { name: 'Info Email', href: 'mailto:info@standardcharteredibank.com' },
  ]
}

export function Footer() {
  return (
    <footer style={{ backgroundColor: colors.backgroundDark }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-3">
            <div className="mb-4">
              <Image
                src="/SCIB logo.svg"
                alt="SCIB"
                width={240}
                height={68}
                className="h-16 w-auto drop-shadow-2xl border border-gray-200 rounded-lg bg-white p-2"
              />
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              A leading international banking group with a presence in 60 of the world's most dynamic markets, serving clients across Asia, and the Middle East.
            </p>
          </div>

          {/* Banking Links */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-semibold mb-4">Banking</h4>
            <ul className="space-y-2">
              {footerLinks.banking.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Corporate Links */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-semibold mb-4">Corporate</h4>
            <ul className="space-y-2">
              {footerLinks.corporate.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-3">
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <div className="flex flex-col space-y-3">
              <span className="text-gray-300 text-sm whitespace-nowrap">
                support@standardcharteredibank.com
              </span>
              <span className="text-gray-300 text-sm whitespace-nowrap">
                info@standardcharteredibank.com
              </span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              © 2026 SCIB. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
