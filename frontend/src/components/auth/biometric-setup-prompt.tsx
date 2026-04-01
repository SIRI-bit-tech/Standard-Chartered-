'use client'

import { useState } from 'react'
import { Fingerprint, Smartphone, X, ShieldCheck, Sparkles } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { parseRegistrationOptions, encodeCredential } from '@/utils/webauthn'
import { toast } from 'sonner'

interface BiometricSetupPromptProps {
  isOpen: boolean
  onClose: () => void
  /** Called after user successfully enables biometrics OR explicitly skips */
  onDone: () => void
}

export function BiometricSetupPrompt({ isOpen, onClose, onDone }: BiometricSetupPromptProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleEnable = async () => {
    setLoading(true)
    try {
      // Step 1: Start registration on the new device
      const res = await apiClient.post<{
        success: boolean
        public_key_credential_creation_options: string
      }>('/api/v1/security/biometrics/register/start', {})

      if (!res.success) throw new Error('Could not start biometric registration')

      // Step 2: Prompt the browser for fingerprint/face
      const options = parseRegistrationOptions(res.public_key_credential_creation_options)
      const credential = await navigator.credentials.create({ publicKey: options }) as any

      if (!credential) throw new Error('Biometric registration was cancelled')

      // Step 3: Complete registration on backend
      const finishRes = await apiClient.post<{ success: boolean; message: string }>(
        '/api/v1/security/biometrics/register',
        {
          credential_id: credential.id,
          public_key_credential: encodeCredential(credential),
        }
      )

      if (finishRes.success) {
        setSuccess(true)
        // Mark device as prompted successfully
        const deviceId = localStorage.getItem('device_id')
        if (deviceId) {
          localStorage.setItem(`biometric_prompted_${deviceId}`, '1')
        }
        // Auto-close after showing success for 1.8 seconds
        setTimeout(() => {
          onDone()
        }, 1800)
      } else {
        throw new Error('Registration could not be completed')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || ''
      if (msg.toLowerCase().includes('cancel') || err?.name === 'NotAllowedError') {
        toast.error('Biometric setup was cancelled.')
        // Mark as prompted even on cancel so we don't keep asking
        const deviceId = localStorage.getItem('device_id')
        if (deviceId) {
          localStorage.setItem(`biometric_prompted_${deviceId}`, '1')
        }
      } else {
        toast.error(msg || 'Failed to enable biometrics. Please try again from Settings.')
      }
      setLoading(false)
    }
  }

  const handleSkip = () => {
    // Mark device as prompted when user skips
    const deviceId = localStorage.getItem('device_id')
    if (deviceId) {
      localStorage.setItem(`biometric_prompted_${deviceId}`, '1')
    }
    onClose()
    onDone()
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Bottom-sheet on mobile, centered modal on desktop */}
      <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden transform transition-all animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">

        {/* Close button */}
        {!success && (
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}

        {success ? (
          /* ── Success State ── */
          <div className="flex flex-col items-center text-center px-8 py-10">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-4 animate-in zoom-in-50 duration-300">
              <ShieldCheck className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">You're all set!</h3>
            <p className="text-sm text-gray-500">
              Biometrics enabled on this device. You can now sign in instantly next time.
            </p>
          </div>
        ) : (
          /* ── Prompt State ── */
          <>
            {/* Header gradient strip */}
            <div className="relative bg-linear-to-br from-primary/10 via-indigo-50 to-purple-50 px-6 pt-8 pb-6 text-center">
              {/* Decorative sparkle */}
              <div className="absolute top-3 left-5 opacity-30">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="absolute top-5 right-8 opacity-20">
                <Sparkles className="w-3 h-3 text-indigo-400" />
              </div>

              {/* Icon stack */}
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center border border-primary/10">
                  <Fingerprint className="w-10 h-10 text-primary" />
                </div>
                {/* Small phone badge */}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center shadow-md">
                  <Smartphone className="w-3.5 h-3.5 text-white" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 leading-snug">
                Enable Biometrics<br />on this device?
              </h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-xs mx-auto">
                You already use biometrics on another device. Set it up here for faster, secure sign-ins.
              </p>
            </div>

            {/* Benefits */}
            <div className="px-6 py-4 space-y-2.5">
              {[
                { icon: '⚡', label: 'Sign in instantly — no password needed' },
                { icon: '🔒', label: 'Protected by your device\'s secure enclave' },
                { icon: '👆', label: 'Just your fingerprint or face, nothing else' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="px-6 pb-8 pt-2 space-y-3">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2.5 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Setting up...
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    Enable Biometrics
                  </>
                )}
              </button>

              <button
                onClick={handleSkip}
                disabled={loading}
                className="w-full py-3 text-sm text-gray-400 font-medium hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
