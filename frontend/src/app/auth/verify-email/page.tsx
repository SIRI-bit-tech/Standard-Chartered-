'use client'

import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLoadingStore } from '@/lib/store'
import { CheckCircle2, XCircle, Loader2, Mail, ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react'

export default function EmailVerificationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'success'>('idle')
  const { show, hide } = useLoadingStore()
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleVerificationSuccess = (data: any) => {
    setSuccess(true)
    setTimeout(() => {
      const redirectEmail = data?.email || email
      const vToken = data?.verification_token || ''
      router.push(`/auth/set-transfer-pin?email=${encodeURIComponent(redirectEmail)}&token=${encodeURIComponent(vToken)}`)
    }, 2000)
  }

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0]
    }

    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-verify if all digits are filled
    if (value && index === 5 && newCode.every(d => d !== '')) {
      handleVerify(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasteData = e.clipboardData.getData('text').slice(0, 6).split('')
    if (pasteData.every(char => /^\d$/.test(char))) {
      const newCode = [...code]
      pasteData.forEach((char, i) => {
        if (i < 6) newCode[i] = char
      })
      setCode(newCode)
      inputRefs.current[Math.min(pasteData.length, 5)]?.focus()
    }
  }

  const handleVerify = async (providedCode?: string) => {
    const fullCode = providedCode || code.join('')
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }

    setVerifying(true)
    setError('')
    show()

    try {
      const response = await apiClient.post<{ success: boolean; message: string; data?: any }>(
        '/api/v1/auth/verify-email',
        { email, verification_code: fullCode },
        { headers: { 'X-Show-Loader': '1' } }
      )

      if (response.success) {
        handleVerificationSuccess(response.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid verification code')
    } finally {
      setVerifying(false)
      hide()
    }
  }

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
        setResendStatus('success')
        setTimeout(() => setResendStatus('idle'), 5000)
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4 shadow-lg shadow-green-200">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Account Security</h1>
          <p className="text-gray-600 mt-2">
            Verifying access for<br />
            <span className="font-semibold text-green-730">{email}</span>
          </p>
        </div>

        <Card className="shadow-2xl border-0 overflow-hidden bg-white/90 backdrop-blur-md">
          <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-gray-800">
              {success ? 'Verified!' : 'Enter Verification Code'}
            </CardTitle>
            <CardDescription className="text-gray-500 font-medium">
              {success
                ? 'Your email has been confirmed. Redirecting...'
                : 'Please enter the 6-digit code sent to your email.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4 pb-8">
            {success ? (
              <div className="flex flex-col items-center justify-center py-6 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-14 h-14 text-green-600" />
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <Alert className="bg-red-50 border-red-200 text-red-800 animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 flex-shrink-0" />
                      <AlertDescription className="font-medium">{error}</AlertDescription>
                    </div>
                  </Alert>
                )}

                <div className="flex justify-between gap-2 max-w-[300px] mx-auto" onPaste={handlePaste}>
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleInputChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      className="w-10 h-14 text-center text-2xl font-bold bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white focus:outline-none transition-all shadow-inner"
                      disabled={verifying}
                    />
                  ))}
                </div>

                <Button
                  onClick={() => handleVerify()}
                  disabled={verifying || code.some(d => !d)}
                  className="w-full h-12 text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl shadow-lg shadow-green-100 transition-all active:scale-[0.98]"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : 'Verify Account'}
                </Button>

                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Mail className="w-4 h-4" />
                    <span>Check your spam if you don't see it</span>
                  </div>

                  <button
                    onClick={handleResendCode}
                    disabled={resending || verifying}
                    className={`text-sm font-semibold transition-all flex items-center justify-center mx-auto ${resendStatus === 'success'
                      ? 'text-green-600 bg-green-50 px-4 py-1 rounded-full'
                      : 'text-green-600 hover:text-green-700 underline-offset-4 hover:underline'
                      }`}
                  >
                    {resending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : resendStatus === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-1" />
                    )}
                    {resendStatus === 'success' ? 'Code Sent!' : 'Resend Code'}
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="flex items-center justify-between mt-8 px-2">
          <Link
            href="/auth/login"
            className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-green-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Login
          </Link>
          <span className="text-xs text-gray-400 font-medium">© 2026 SCIB</span>
        </div>
      </div>
    </div>
  )
}
