'use client'

import { SecurityPanel } from '@/components/profile/security-panel'
import { ShieldCheck } from 'lucide-react'

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="max-w-4xl mx-auto p-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Manage your account security, authentication methods, and transfer PIN to keep your banking experience secure.
          </p>
        </div>

        {/* Security Panel */}
        <SecurityPanel />
      </div>
    </div>
  )
}
