'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSearchParams } from 'next/navigation'
import { useLoadingStore } from '@/lib/store'
import posthog from 'posthog-js'
import { useEffect } from 'react'
import { CheckCircle2, XCircle, Loader2, Mail, ArrowLeft, RefreshCw } from 'lucide-react'

export default function EmailVerificationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const { show, hide } = useLoadingStore()

  useEffect(() => {
    const autoVerify = async () => {
      const urlToken = searchParams.get('token') || searchParams.get('stytch_token')
      if (!urlToken) return

      setVerifying(true)
      show()
      try {
        const response = await apiClient.post<{ success: boolean; message: string; data?: any }>(
          '/api/v1/auth/verify-magic-link',
          { token: urlToken },
          { headers: { 'X-Show-Loader': '1' } }
        )

        if (response.success) {
          posthog.capture('email_verified_magic_link', { email: response.data?.email || email });
          setSuccess(true)
          setTimeout(() => {
            const redirectEmail = response.data?.email || email
            const vToken = response.data?.verification_token || ''
            router.push(`/auth/set-transfer-pin?email=${encodeURIComponent(redirectEmail)}&token=${encodeURIComponent(vToken)}`)
          }, 2000)
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Verification link is invalid or has expired.')
      } finally {
        setVerifying(false)
        hide()
      }
    }
    autoVerify()
  }, [searchParams])

  const handleResendCode = async () => {
    setResending(true)
    setError('')
    show()

    try {
      const response = await apiClient.post<{ success: boolean; message: string; data?: any }>(
        '/api/v1/auth/resend-verification',
        { email },
        { headers: { 'X-Show-Loader': '1' } }
      )

      if (response.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to resend code. Please try again.')
    } finally {
      setResending(false)
      hide()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Your Email</h1>
          <p className="text-gray-600 mt-2">
            We've sent a verification link to<br />
            <span className="font-medium text-green-600">{email}</span>
          </p>
        </div>

        {/* Verification Form */}
        {/* Status Display */}
        <Card className="shadow-2xl border-0 overflow-hidden bg-white/80 backdrop-blur-md">
          <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-700 to-emerald-800">
              {verifying ? 'Verifying Link' : success ? 'Successfully Verified' : 'Check Your Inbox'}
            </CardTitle>
            <CardDescription className="text-gray-500 font-medium pt-2">
              {verifying
                ? 'Please wait while we confirm your security token...'
                : success
                  ? 'Your account is now active. Redirecting you to set up your secure PIN.'
                  : 'We\'ve sent a secure magic link to your email address.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 py-6">
            {/* Success Animation */}
            {success && (
              <div className="flex flex-col items-center justify-center animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <Alert className="bg-red-50 border-red-200 text-red-800 animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5" />
                  <AlertDescription className="font-medium">{error}</AlertDescription>
                </div>
              </Alert>
            )}

            {!success && !error && !verifying && (
              <div className="flex flex-col items-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-200 blur-2xl rounded-full opacity-20 animate-pulse" />
                  <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                    <Mail className="w-12 h-12 text-white" />
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <p className="text-gray-600 italic">
                    Click the button in the email to automatically verify your account.
                  </p>
                  <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 py-1 px-3 rounded-full inline-block">
                    {email}
                  </p>
                </div>
              </div>
            )}

            {verifying && (
              <div className="flex flex-col items-center py-4">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                <p className="text-sm text-gray-500 mt-4 font-medium italic">Handshaking with our security provider...</p>
              </div>
            )}

            {/* Resend Link */}
            {!success && !verifying && (
              <div className="pt-4 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500 mb-4">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleResendCode}
                  disabled={resending}
                  className="rounded-full px-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all font-semibold"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resend Magic Link
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back to Login */}
        <div className="text-center mt-6">
          <Link
            href="/auth/login"
            className="inline-flex items-center text-sm text-gray-600 hover:text-green-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
