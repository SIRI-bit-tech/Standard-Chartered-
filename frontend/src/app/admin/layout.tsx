'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Attach admin token for admin API calls.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('admin_token')
    if (token) apiClient.setAuthToken(token)
  }, [])

  // Keep auth pages clean (no admin chrome).
  const isAuthRoute = pathname?.startsWith('/admin/auth')
  if (isAuthRoute) return <>{children}</>

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

