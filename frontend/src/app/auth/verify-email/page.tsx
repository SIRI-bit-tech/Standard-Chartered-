'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, ArrowLeft, RefreshCw } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useLoadingStore } from '@/lib/store'

export default function EmailVerificationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  
  const [verificationCode, setVerificationCode] = useState('')
  const [isCodeComplete, setIsCodeComplete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { show, hide } = useLoadingStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isCodeComplete || !verificationCode || verificationCode.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }

    if (!email) {
      setError('Email parameter is missing. Please start registration again.')
      return
    }

    setLoading(true)
    setError('')
    show()

    try {
      const requestData = {
        email,
        verification_code: verificationCode
      }
      
      const response = await apiClient.post<{success: boolean; message: string; data?: any}>(
        '/api/v1/auth/verify-email',
        requestData,
        { headers: { 'X-Show-Loader': '1' } }
      )

      if (response.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/auth/set-transfer-pin?email=${encodeURIComponent(email)}`)
        }, 2000)
      }
    } catch (error: any) {
      let errorMessage = 'Verification failed. Please try again.'
      
      if (error.response?.data) {
        const data = error.response.data
        if (typeof data === 'string') {
          errorMessage = data
        } else if (data.detail) {
          errorMessage = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
        } else if (data.message) {
          errorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message)
        }
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
      hide()
    }
  }

  const handleResendCode = async () => {
    setResending(true)
    setError('')
    show()

    try {
      const response = await apiClient.post<{success: boolean; message: string; data?: any}>(
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
            We've sent a verification code to<br />
            <span className="font-medium text-green-600">{email}</span>
          </p>
        </div>

        {/* Verification Form */}
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Enter Verification Code</CardTitle>
            <CardDescription>
              Please enter the 6-digit code from your email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Success Message */}
            {success && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <AlertDescription>
                  {verificationCode.length === 6 
                    ? 'Email verified successfully! Redirecting...'
                    : 'New code sent successfully!'
                  }
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert className="bg-red-50 border-red-200 text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Verification Code Input */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-center">
                <InputOTP 
                  maxLength={6}
                  onComplete={(value: string) => {
                    setVerificationCode(value)
                    setIsCodeComplete(true)
                  }}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-12 h-12 text-lg" />
                    <InputOTPSlot index={1} className="w-12 h-12 text-lg" />
                    <InputOTPSlot index={2} className="w-12 h-12 text-lg" />
                    <InputOTPSlot index={3} className="w-12 h-12 text-lg" />
                    <InputOTPSlot index={4} className="w-12 h-12 text-lg" />
                    <InputOTPSlot index={5} className="w-12 h-12 text-lg" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={loading || !isCodeComplete}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>
            </form>

            {/* Resend Code */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                Didn't receive the code?
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendCode}
                disabled={resending}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                {resending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>
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
