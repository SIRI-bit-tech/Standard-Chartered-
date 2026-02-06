'use client'

import React from 'react'
import Link from 'next/link'
import { LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/approvals', label: 'Approvals' },
  { href: '/admin/transfers', label: 'Transfers' },
  { href: '/admin/deposits', label: 'Deposits' },
  { href: '/admin/cards', label: 'Virtual Cards' },
  { href: '/admin/loans', label: 'Loans' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
]

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_refresh_token')
    window.location.href = '/admin/auth/login'
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-primary text-white transition-all duration-300 border-r border-primary-dark flex flex-col`}
      >
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && <span className="text-xl font-bold">SC Admin</span>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-primary-dark rounded"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {adminNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-primary-dark transition text-sm"
            >
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-primary-dark">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-3 text-red-300 hover:bg-primary-dark rounded-lg transition text-sm"
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-border shadow-sm sticky top-0 z-40 px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-error hover:bg-error-light rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
