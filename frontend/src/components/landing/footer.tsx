'use client'

import { Facebook, Twitter, Linkedin, Instagram, Youtube } from 'lucide-react'
import { colors } from '@/types'
import Link from 'next/link'
import Image from 'next/image'

const socialLinks = [
  { icon: Facebook, href: '#' },
  { icon: Twitter, href: '#' },
  { icon: Linkedin, href: '#' },
  { icon: Instagram, href: '#' },
  { icon: Youtube, href: '#' }
]

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
  ]
}

export function Footer() {
  return (
    <footer style={{ backgroundColor: colors.backgroundDark }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <Image
                src="/logo.png"
                alt="Standard Chartered"
                width={200}
                height={56}
                className="h-14 w-auto"
              />
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              A leading international banking group with a presence in 60 of the world's most dynamic markets, serving clients across Asia, Africa, and the Middle East.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Banking Links */}
          <div>
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
          <div>
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
          <div>
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
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <p className="text-center text-gray-400 text-sm">
            © 2026 Standard Chartered. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
