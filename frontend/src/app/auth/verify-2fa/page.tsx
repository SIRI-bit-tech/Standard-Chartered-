'use client'

import { useMemo, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import { identifyUser, trackEvent } from '@/lib/analytics'
import { BiometricSetupPrompt } from '@/components/auth/biometric-setup-prompt'

export default function Verify2FA() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { setUser, setToken } = useAuthStore()

  // Cross-device biometric setup prompt
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false)
  const [postLoginRedirect, setPostLoginRedirect] = useState('/dashboard')

  const maybeShowBiometricPrompt = (biometricEnabled: boolean, deviceId: string | undefined, redirect = '/dashboard') => {
    const supportsWebAuthn = typeof globalThis !== 'undefined' && !!globalThis.PublicKeyCredential
    const promptKey = `biometric_prompted_${deviceId || 'unknown'}`
    const alreadyPrompted = deviceId ? localStorage.getItem(promptKey) === '1' : false

    // Show prompt if user has biometrics enabled on another device and hasn't been prompted on this device
    if (biometricEnabled && supportsWebAuthn && !alreadyPrompted) {
      setPostLoginRedirect(redirect)
      setShowBiometricPrompt(true)
    } else {
      globalThis.location.href = redirect
    }
  }

  const params = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams()
    return new URLSearchParams(window.location.search)
  }, [])

  const session = params.get('session') || ''
  const device_id = params.get('device') || ''
  const device_name = params.get('name') || ''

  // Do not collect or send client-derived IPs for security decisions.

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.post<any>(
        '/api/v1/auth/2fa/complete',
        {
          session_token: session,
          code,
          trust_device: false,
          device_id,
          device_name
        },
        {}
      )
      if (res?.token?.access_token) {
        localStorage.setItem('access_token', res.token.access_token)
        localStorage.setItem('refresh_token', res.token.refresh_token)
        document.cookie = `accessToken=${res.token.access_token}; path=/; max-age=3600; secure; samesite=strict`
        const userData = {
          id: res.data.user_id || res.data.id || '',
          email: res.data.email || '',
          username: res.data.username || '',
          first_name: res.data.first_name || '',
          last_name: res.data.last_name || '',
          phone: res.data.phone || undefined,
          created_at: res.data.created_at || new Date().toISOString(),
          last_login: res.data.last_login || new Date().toISOString(),
          primary_currency: res.data.primary_currency || 'USD',
          country: res.data.country || 'United States',
          email_verified: !!res.data.email_verified,
          phone_verified: !!res.data.phone_verified,
          identity_verified: !!res.data.identity_verified,
          biometric_enabled: !!res.data.biometric_enabled,
          tier: res.data.tier || 'standard',
          profile_picture_url: res.data.profile_picture_url || null
        }
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData as any)
        setToken(res.token.access_token)

        // Identify user – only non-PII attributes, only with consent
        identifyUser(userData.id, {
          country: userData.country,
          tier: userData.tier
        });
        trackEvent('2fa_verified');
        trackEvent('login_success', { mfa: true });

        maybeShowBiometricPrompt(userData.biometric_enabled, device_id || undefined)
        return
      }
      setError('Verification failed. Please try again.')
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Cross-device Biometric Setup Prompt */}
      <BiometricSetupPrompt
        isOpen={showBiometricPrompt}
        onClose={() => setShowBiometricPrompt(false)}
        onDone={() => {
          setShowBiometricPrompt(false)
          globalThis.location.href = postLoginRedirect
        }}
      />

      <div className="bg-white p-8 rounded-2xl shadow-lg border border-border max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2">Two-Factor Verification</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter the 6-digit code from your authenticator app to continue.
        </p>
        {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mb-4"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
        />
        <button
          className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
          disabled={loading || code.length !== 6}
          onClick={handleSubmit}
        >
          {loading ? 'Verifying...' : 'Verify and Continue'}
        </button>
      </div>
    </>
  )
}
