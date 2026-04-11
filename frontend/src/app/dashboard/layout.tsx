'use client'

import { useEffect } from 'react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import { TradingViewTicker } from '@/components/dashboard/tradingview-ticker'
import BottomNavbar from '@/components/navigation/bottom-navbar'
import { apiClient } from '@/lib/api-client'
import { SessionKeeper } from '@/hooks/use-session-keeper'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { LinkClickLoader } from '@/components/ui/link-click-loader'
import Script from 'next/script'

import { RestrictionProvider } from '@/components/auth/RestrictionProvider'
import { SetupTransferPinModal } from '@/components/auth/setup-transfer-pin-modal'
import { useAuthStore } from '@/lib/store'
import { useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuthStore()
  const [showPinModal, setShowPinModal] = useState(false)

  // Ensure API client sends Bearer token for authenticated requests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token')
      if (token) apiClient.setAuthToken(token)
    }
  }, [])

  // Check if PIN setup is required
  useEffect(() => {
    // Only show if user is logged in and hasn't set their PIN
    // and we are NOT already on the dashboard page (to avoid overlapping with other UI)
    // Actually, we want it to block the dashboard, so layout is the right place.
    if (user && user.transfer_pin_set === false) {
      setShowPinModal(true)
    } else {
      setShowPinModal(false)
    }
  }, [user])

  return (
    <RestrictionProvider>
      <div className="flex h-screen bg-background">
        <Script id="boot-preloader" strategy="beforeInteractive">
          {`(function(){try{document.documentElement.classList.add('app-preloading');var d=document.createElement('div');d.id='app-boot-preloader';d.innerHTML='<div class="dot"></div>';document.body.appendChild(d);}catch(e){}})();`}
        </Script>
        <DashboardSidebar />
        <div className="flex flex-1 flex-col min-w-0 xl:pb-0 pb-20 overflow-hidden">
          <DashboardHeader />
          <TradingViewTicker />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <SessionKeeper />
        </div>
        <LoadingOverlay />
        <LinkClickLoader />
        <BottomNavbar />

        {user && (
          <SetupTransferPinModal 
            open={showPinModal}
            onOpenChange={setShowPinModal}
            onSuccess={() => setShowPinModal(false)}
            email={user.email}
            token={localStorage.getItem('access_token') || ''}
          />
        )}
      </div>
    </RestrictionProvider>
  )
}
