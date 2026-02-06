'use client'

import React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import TopHeader from '@/components/navigation/top-header'
import BottomNavbar from '@/components/navigation/bottom-navbar'

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/accounts', label: 'Accounts' },
  { href: '/dashboard/transfers', label: 'Transfers' },
  { href: '/dashboard/loans', label: 'Loans' },
  { href: '/dashboard/bills', label: 'Bills' },
  { href: '/dashboard/deposits', label: 'Deposits' },
  { href: '/dashboard/virtual-cards', label: 'Cards' },
  { href: '/dashboard/support', label: 'Support' },
  { href: '/dashboard/profile', label: 'Profile' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-primary text-white transition-all duration-300 border-r border-primary-dark hidden lg:flex flex-col`}
      >
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && <span className="text-xl font-bold">SC Bank</span>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-primary-dark rounded"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-primary-dark transition text-sm"
            >
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:pb-0 pb-20">
        <TopHeader />

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation - Hidden on desktop */}
      <BottomNavbar />
    </div>
  )
}
