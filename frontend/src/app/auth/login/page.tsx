'use client'

import React, { useState } from "react"
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useLoadingStore } from '@/lib/store'
import { ShieldCheck, Monitor, Smartphone, Eye, EyeOff } from 'lucide-react'
import { stytchClient } from '@/lib/stytch-client'
import { identifyUser, trackEvent } from '@/lib/analytics'
import { parseApiError } from '@/utils/error-handler'
import { Fingerprint } from 'lucide-react'
import { encodeCredential } from '@/utils/webauthn'
import { toast } from 'sonner'
import type { User } from '@/types'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorFields, setErrorFields] = useState<string[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const { setUser, setToken } = useAuthStore()
  const { show, hide } = useLoadingStore()

  const [showTrustModal, setShowTrustModal] = useState(false)
  const [trustDeviceData, setTrustDeviceData] = useState<any>(null)
  const [isTrusting, setIsTrusting] = useState(false)

  const getDeviceInfo = () => {
    try {
      let id = localStorage.getItem('device_id')
      if (!id) {
        id = crypto.randomUUID()
        localStorage.setItem('device_id', id)
      }
      const ua = navigator.userAgent || ''
      const platform = (navigator as any).platform || ''
      const name = `${platform || 'Device'} • ${ua.split(' ').slice(0, 2).join(' ')}`
      return { device_id: id, device_name: name }
    } catch {
      return { device_id: undefined, device_name: undefined }
    }
  }

  const handleLogin = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    setLoading(true)
    setError('')
    show()

    try {
      const { device_id, device_name } = getDeviceInfo()

      // Get Stytch Telemetry ID for fraud protection
      let telemetry_id = ''
      try {
        // Cast to any to bypass missing property error in Stytch SDK types
        telemetry_id = await (stytchClient as any).dfp.getTelemetryId()
      } catch (dfpErr) {
        console.warn('Failed to get Stytch telemetry ID', dfpErr)
      }

      const response = await apiClient.post<{ success: boolean; data: any; token: any }>(
        '/api/v1/auth/login',
        {
          username,
          password,
          device_id,
          device_name,
          telemetry_id,
        },
        { headers: { 'X-Show-Loader': '1' } }
      )

      if (response?.data?.two_factor_required && response?.data?.session_token) {
        hide()
        setLoading(false)
        const params = new URLSearchParams()
        params.set('session', response.data.session_token)
        params.set('device', device_id || '')
        params.set('name', device_name || '')
        window.location.href = `/auth/verify-2fa?${params.toString()}`
        return
      }

      if (response.success && response.data && response.token) {
        const tokens = response.token;
        const data = response.data;

        const completeLogin = () => {
          if (tokens.access_token && tokens.refresh_token) {
            localStorage.setItem('access_token', tokens.access_token)
            localStorage.setItem('refresh_token', tokens.refresh_token)
            document.cookie = `accessToken=${tokens.access_token}; path=/; max-age=3600; secure; samesite=strict`

            const userData: User = {
              id: data.user_id || data.id || '',
              email: data.email || '',
              username: data.username || '',
              first_name: data.first_name || '',
              last_name: data.last_name || '',
              phone: data.phone || undefined,
              country: data.country || 'United States',
              primary_currency: data.primary_currency || 'USD',
              tier: data.tier || 'basic',
              profile_picture_url: data.profile_picture_url || null,
              email_verified: !!data.email_verified,
              phone_verified: !!data.phone_verified,
              identity_verified: !!data.identity_verified,
              biometric_enabled: !!data.biometric_enabled,
              created_at: data.created_at || new Date().toISOString(),
              last_login: data.last_login || new Date().toISOString()
            }
            localStorage.setItem('user', JSON.stringify(userData))
            setUser(userData)
            setToken(tokens.access_token)

            // Identify user – only non-PII attributes, only with consent
            identifyUser(userData.id, {
              country: userData.country,
              tier: userData.tier,
            });
            trackEvent('login_success');

          }

          setLoading(false)
          hide()
          window.location.href = '/dashboard'
        }

        if (data.is_new_device) {
          setLoading(false)
          hide()
          setTrustDeviceData({ tokens, data })
          setShowTrustModal(true)
          return
        }

        completeLogin()
      } else {
        setLoading(false)
        hide()
        setError('Login failed. Please try again.')
      }
    } catch (err: any) {
      setLoading(false)
      hide()
      const { message, errorFields: fields } = parseApiError(err)
      setError(message)
      setErrorFields(fields)
    }
  }

  const handleBiometricLogin = async () => {
    setLoading(true)
    setError('')
    show()

    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 60000,
          userVerification: "required"
        },
        mediation: 'optional'
      }) as any

      if (!credential) {
        throw new Error('Biometric authentication cancelled')
      }

      const response = await apiClient.post<{ success: boolean; data: any; token: any }>(
        '/api/v1/auth/biometrics/authenticate',
        {
          credential_id: credential.id,
          public_key_credential: encodeCredential(credential)
        }
      )

      if (response.success && response.data && response.token) {
        const tokens = response.token
        const data = response.data.user

        localStorage.setItem('access_token', tokens.access_token)
        localStorage.setItem('refresh_token', tokens.refresh_token)
        document.cookie = `accessToken=${tokens.access_token}; path=/; max-age=3600; secure; samesite=strict`

        const userData: User = {
          id: data.id || '',
          email: data.email || '',
          username: data.username || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || undefined,
          country: data.country || 'United States',
          primary_currency: data.primary_currency || 'USD',
          tier: data.tier || 'basic',
          profile_picture_url: data.profile_picture_url || null,
          email_verified: !!data.email_verified,
          phone_verified: !!data.phone_verified,
          identity_verified: !!data.identity_verified,
          biometric_enabled: true,
          created_at: data.created_at || new Date().toISOString(),
          last_login: new Date().toISOString()
        }

        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
        setToken(tokens.access_token)

        identifyUser(userData.id, {
          country: userData.country,
          tier: userData.tier,
        })
        trackEvent('login_success', { method: 'biometric' })

        setLoading(false)
        hide()
        toast.success("Welcome back! Signed in with Biometrics.")
        window.location.href = '/dashboard'
      } else {
        throw new Error('Authentication response invalid')
      }
    } catch (err: any) {
      setLoading(false)
      hide()
      console.error('Biometric login error:', err)
      const { message } = parseApiError(err)
      setError(message || "Device could not verify your identity. Please use your password.")
    }
  }

  return (
    <>
      {/* Trust Device Modal */}
      {showTrustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-300">
            <div className="bg-primary/5 p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">New Device Detected</h3>
              <p className="text-sm text-gray-500 mt-2">
                This appears to be a new device. Would you like to trust it for future logins?
              </p>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl mb-6 border border-border/50">
                {trustDeviceData?.data?.device_name?.includes('Android') || trustDeviceData?.data?.device_name?.includes('iPhone') ? (
                  <Smartphone className="w-6 h-6 text-gray-400" />
                ) : (
                  <Monitor className="w-6 h-6 text-gray-400" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {trustDeviceData?.data?.device_name || 'Current Device'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Auto-detected device signature
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    if (isTrusting) return;
                    setIsTrusting(true);
                    try {
                      await apiClient.post('/api/v1/security/devices/trust', {
                        device_id: trustDeviceData.data.device_id,
                        device_name: trustDeviceData.data.device_name
                      }, {
                        headers: {
                          'Authorization': `Bearer ${trustDeviceData.tokens.access_token}`
                        }
                      });
                    } catch (err) {
                      console.error('Failed to trust device:', err);
                    } finally {
                      setIsTrusting(false);

                      const data = trustDeviceData.data;
                      const tokens = trustDeviceData.tokens;

                      if (tokens.access_token && tokens.refresh_token) {
                        localStorage.setItem('access_token', tokens.access_token)
                        localStorage.setItem('refresh_token', tokens.refresh_token)
                        document.cookie = `accessToken=${tokens.access_token}; path=/; max-age=3600; secure; samesite=strict`

                        const userData: User = {
                          id: data.user_id || data.id || '',
                          email: data.email || '',
                          username: data.username || '',
                          first_name: data.first_name || '',
                          last_name: data.last_name || '',
                          phone: data.phone || undefined,
                          country: data.country || 'United States',
                          primary_currency: data.primary_currency || 'USD',
                          tier: data.tier || 'basic',
                          profile_picture_url: data.profile_picture_url || null,
                          email_verified: !!data.email_verified,
                          phone_verified: !!data.phone_verified,
                          identity_verified: !!data.identity_verified,
                          biometric_enabled: !!data.biometric_enabled,
                          created_at: data.created_at || new Date().toISOString(),
                          last_login: data.last_login || new Date().toISOString()
                        }
                        localStorage.setItem('user', JSON.stringify(userData))
                        setUser(userData)
                        setToken(tokens.access_token)

                        // Identify user – only non-PII attributes, only with consent
                        identifyUser(userData.id, {
                          country: userData.country,
                          tier: userData.tier,
                        });
                        trackEvent('login_success', { device_trusted: true });

                      }
                      window.location.href = '/dashboard';
                    }
                  }}
                  disabled={isTrusting}
                  className="w-full py-3 px-4 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  {isTrusting ? 'Saving...' : 'Yes, Trust this Device'}
                </button>
                <button
                  onClick={() => {
                    const data = trustDeviceData.data;
                    const tokens = trustDeviceData.tokens;

                    if (tokens.access_token && tokens.refresh_token) {
                      localStorage.setItem('access_token', tokens.access_token)
                      localStorage.setItem('refresh_token', tokens.refresh_token)
                      document.cookie = `accessToken=${tokens.access_token}; path=/; max-age=3600; secure; samesite=strict`

                      const userData: any = {
                        id: data.user_id || data.id || '',
                        email: data.email || '',
                        username: data.username || '',
                        first_name: data.first_name || '',
                        last_name: data.last_name || '',
                        phone: data.phone || undefined,
                        country: data.country || 'United States',
                        primary_currency: data.primary_currency || 'USD',
                        tier: data.tier || 'basic',
                        profile_picture_url: data.profile_picture_url || null,
                        email_verified: data.email_verified || false,
                        phone_verified: data.phone_verified || false,
                        identity_verified: data.identity_verified || false,
                        biometric_enabled: data.biometric_enabled || false,
                        created_at: data.created_at || new Date().toISOString(),
                        last_login: data.last_login || new Date().toISOString()
                      }
                      localStorage.setItem('user', JSON.stringify(userData))
                      setUser(userData)
                      setToken(tokens.access_token)

                      // Identify user – only non-PII attributes, only with consent
                      identifyUser(userData.id, {
                        country: userData.country,
                        tier: userData.tier,
                      });
                      trackEvent('login_success', { device_trusted: false });

                    }
                    window.location.href = '/dashboard'
                  }}
                  className="w-full py-3 px-4 bg-transparent text-gray-500 rounded-xl hover:bg-gray-50 transition-all font-medium"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-2xl shadow-lg border border-border">
        <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
        <p className="text-muted-foreground mb-8">Sign in to your Standard Chartered account</p>

        {error && (
          <div className="mb-6 p-4 bg-error/10 text-error rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errorFields.includes('username')) setErrorFields(prev => prev.filter(f => f !== 'username'));
                setError('');
              }}
              placeholder="Enter your username"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder:text-gray-400 ${errorFields.includes('username') ? 'border-error ring-error/20' : 'border-border'}`}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorFields.includes('password')) setErrorFields(prev => prev.filter(f => f !== 'password'));
                  setError('');
                }}
                placeholder="Enter your password"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder:text-gray-400 ${errorFields.includes('password') ? 'border-error ring-error/20' : 'border-border'}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4 rounded accent-primary" />
              <span className="text-gray-500">Remember me</span>
            </label>
            <Link href="/auth/forgot-password" className="text-primary hover:underline font-medium">
              Forgot password?
            </Link>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition font-semibold disabled:opacity-50 shadow-md"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="relative flex items-center gap-4 py-2">
            <div className="h-px bg-border flex-1" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold bg-white px-2">OR</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <button
            type="button"
            onClick={handleBiometricLogin}
            disabled={loading}
            className="w-full py-4 bg-white border-2 border-primary/20 text-primary rounded-xl hover:bg-primary/5 transition-all font-bold flex items-center justify-center gap-3 shadow-sm group disabled:opacity-50"
          >
            <Fingerprint className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Sign in with Passkey
          </button>
        </div>

        <p className="text-center text-muted-foreground mt-6">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </>
  )
}
