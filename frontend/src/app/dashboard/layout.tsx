'use client'

import { useEffect } from 'react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import BottomNavbar from '@/components/navigation/bottom-navbar'
import { apiClient } from '@/lib/api-client'
import { SessionKeeper } from '@/hooks/use-session-keeper'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { RouteChangeLoader } from '@/components/ui/route-change-loader'
import { LinkClickLoader } from '@/components/ui/link-click-loader'
import Script from 'next/script'

import { RestrictionProvider } from '@/components/auth/RestrictionProvider'
import { RestrictionBanner } from '@/components/auth/RestrictionBanner'
import { useAuth } from '@/hooks/use-auth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()

  // Ensure API client sends Bearer token for authenticated requests (e.g. transfers with PIN)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token')
      if (token) apiClient.setAuthToken(token)
    }
  }, [])

  return (
    <RestrictionProvider>
      <div className="flex h-screen bg-background">
        <Script id="boot-preloader" strategy="beforeInteractive">
          {`(function(){try{document.documentElement.classList.add('app-preloading');var d=document.createElement('div');d.id='app-boot-preloader';d.innerHTML='<div class="dot"></div>';document.body.appendChild(d);}catch(e){}})();`}
        </Script>
        <DashboardSidebar />
        <div className="flex flex-1 flex-col min-w-0 xl:pb-0 pb-24">
          <DashboardHeader />
          {user?.is_restricted && (
            <div className="restriction-allow">
              <RestrictionBanner userName={`${user.first_name} ${user.last_name}`} />
            </div>
          )}
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
    </RestrictionProvider>
  )
}
