'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { RouteChangeLoader } from '@/components/ui/route-change-loader'
import { LinkClickLoader } from '@/components/ui/link-click-loader'
import Script from 'next/script'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Do not set global Authorization header here; the API client attaches admin/user tokens per-request.

  // Keep auth pages clean (no admin chrome).
  const isAuthRoute = pathname?.startsWith('/admin/auth')
  if (isAuthRoute) return (
    <>
      <Script id="boot-preloader-admin-auth" strategy="beforeInteractive">
        {`(function(){try{document.documentElement.classList.add('app-preloading');var d=document.createElement('div');d.id='app-boot-preloader';d.innerHTML='<div class="dot"></div>';document.body.appendChild(d);}catch(e){}})();`}
      </Script>
      {children}
      <LoadingOverlay />
      <RouteChangeLoader />
      <LinkClickLoader />
    </>
  )

  return (
    <div className="flex h-screen bg-background">
      <Script id="boot-preloader-admin" strategy="beforeInteractive">
        {`(function(){try{document.documentElement.classList.add('app-preloading');var d=document.createElement('div');d.id='app-boot-preloader';d.innerHTML='<div class="dot"></div>';document.body.appendChild(d);}catch(e){}})();`}
      </Script>
      <AdminSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <LoadingOverlay />
      <RouteChangeLoader />
      <LinkClickLoader />
    </div>
  )
}
