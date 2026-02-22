'use client'

import { useState, useEffect } from 'react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import BottomNavbar from '@/components/navigation/bottom-navbar'
import { apiClient } from '@/lib/api-client'
import { SessionKeeper } from '@/hooks/use-session-keeper'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { RouteChangeLoader } from '@/components/ui/route-change-loader'
import { LinkClickLoader } from '@/components/ui/link-click-loader'
import Script from 'next/script'

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
      <Script id="boot-preloader" strategy="beforeInteractive">
        {`(function(){try{document.documentElement.classList.add('app-preloading');var d=document.createElement('div');d.id='app-boot-preloader';d.innerHTML='<div class="dot"></div>';document.body.appendChild(d);}catch(e){}})();`}
      </Script>
      <DashboardSidebar
        mobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
      />
      <div className="flex flex-1 flex-col min-w-0 xl:pb-0 pb-24">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <SessionKeeper />
      </div>
      <LoadingOverlay />
      <RouteChangeLoader />
      <LinkClickLoader />
      <BottomNavbar />
    </div>
  )
}
