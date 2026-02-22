import React from "react"
import Link from 'next/link'
import { Shield, Globe, Zap } from 'lucide-react'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { RouteChangeLoader } from '@/components/ui/route-change-loader'
import { LinkClickLoader } from '@/components/ui/link-click-loader'
import Script from 'next/script'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex">
      <Script id="boot-preloader-auth" strategy="beforeInteractive">
        {`(function(){try{document.documentElement.classList.add('app-preloading');var d=document.createElement('div');d.id='app-boot-preloader';d.innerHTML='<div class="dot"></div>';document.body.appendChild(d);}catch(e){}})();`}
      </Script>
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("/standardcharted.png")' }}>
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 text-white flex-col justify-between p-8 flex">
          <div>
            <Link href="/" className="inline-block bg-white p-2 rounded-lg shadow-lg">
              <img
                src="/logo.png"
                alt="Standard Chartered"
                className="h-10 w-auto"
              />
            </Link>
            <p className="mt-3 text-white font-semibold text-lg">Digital Banking Platform</p>
          </div>
          <div>
            <h2 className="text-4xl font-bold mb-4">Welcome to the Future of Banking</h2>
            <p className="text-lg text-white/90 mb-8 font-medium">
              Manage your finances securely with our state-of-the-art banking platform.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Shield className="w-8 h-8 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">Secure</h3>
                  <p className="text-white/80 font-medium">Bank-grade security for your peace of mind</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Globe className="w-8 h-8 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">Global</h3>
                  <p className="text-white/80 font-medium">Multi-currency support for international transactions</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Zap className="w-8 h-8 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">Fast</h3>
                  <p className="text-white/80 font-medium">Instant transfers and real-time updates</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Mobile logo header - only visible on small screens */}
        <div className="lg:hidden w-full max-w-md mb-6 flex items-center gap-3">
          <Link href="/" className="inline-block bg-white p-2 rounded-lg shadow border border-gray-100">
            <img
              src="/logo.png"
              alt="Standard Chartered"
              className="h-8 w-auto"
            />
          </Link>
          <div>
            <p className="text-sm font-bold text-foreground">Standard Chartered</p>
            <p className="text-xs text-muted-foreground">Digital Banking Platform</p>
          </div>
        </div>
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
      <LoadingOverlay />
      <RouteChangeLoader />
      <LinkClickLoader />
    </div>
  )
}
