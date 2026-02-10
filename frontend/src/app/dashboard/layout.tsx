'use client'

import { useState, useEffect } from 'react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import BottomNavbar from '@/components/navigation/bottom-navbar'
import { apiClient } from '@/lib/api-client'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Ensure API client sends Bearer token for authenticated requests (e.g. transfers with PIN)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token')
      if (token) apiClient.setAuthToken(token)
    }
  }, [])

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar
        mobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
      />
      <div className="flex flex-1 flex-col min-w-0 md:pb-0 pb-20">
        <DashboardHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <BottomNavbar />
    </div>
  )
}
