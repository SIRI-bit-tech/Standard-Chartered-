'use client'

import { Suspense } from 'react'
import { SetupTransferPinModal } from '@/components/auth/setup-transfer-pin-modal'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

function SetTransferPinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const email = searchParams.get('email') || ''
  const token = searchParams.get('token') || ''

  const handleSuccess = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Image 
              src="/SCIB logo.svg" 
              alt="SCIB Logo" 
              width={64} 
              height={64} 
              className="drop-shadow-lg"
            />
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">SCIB</h1>
          </div>
          <p className="text-gray-600 font-medium">Securing Your Account</p>
        </div>

        <SetupTransferPinModal 
          open={true} 
          onOpenChange={() => {}}
          onSuccess={handleSuccess} 
          email={email} 
          token={token} 
        />
      </div>
    </div>
  )
}

export default function SetTransferPinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    }>
      <SetTransferPinContent />
    </Suspense>
  )
}
