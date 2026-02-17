'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, ArrowLeft, CheckCircle, Shield } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useLoadingStore } from '@/lib/store'

export default function SetTransferPinPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const { setUser } = useAuthStore()
  const { show, hide } = useLoadingStore()
  
  const [transferPin, setTransferPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!transferPin) {
      setError('Please enter a 4-digit PIN')
      return
    }

    if (!confirmPin) {
      setError('Please confirm your 4-digit PIN')
      return
    }

    if (transferPin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    setLoading(true)
    setError('')
    show()

    try {
      const response = await apiClient.post<{success: boolean; message: string; data?: any}>(
        '/api/v1/auth/set-transfer-pin',
        {
          email,
          transfer_pin: transferPin
        },
        { headers: { 'X-Show-Loader': '1' } }
      )

      if (response.success) {
        // Store authentication tokens and user data
        if (response.data?.access_token) {
          localStorage.setItem('access_token', response.data.access_token)
        }
        if (response.data?.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token)
        }
        if (response.data?.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user))
          setUser(response.data.user) // Update auth store
        }
        
        setSuccess(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (error: any) {
      console.error('Transfer PIN error:', error)
      
      // Handle different error response formats
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          setError(error.response.data.detail)
        } else if (Array.isArray(error.response.data.detail)) {
          const validationError = error.response.data.detail[0]
          setError(validationError.msg || 'Failed to set transfer PIN')
        } else {
          setError('Failed to set transfer PIN. Please try again.')
        }
      } else {
        setError('Failed to set transfer PIN. Please try again.')
      }
    } finally {
      setLoading(false)
      hide()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set Transfer PIN</h1>
          <p className="text-gray-600 mt-2">
            Create a 4-digit PIN for secure transfers
          </p>
        </div>

        {/* PIN Setup Form */}
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Secure Your Account</CardTitle>
            <CardDescription>
              This PIN will be required for all transfer transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Success Message */}
            {success && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  Transfer PIN set successfully! Your accounts have been created.
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert className="bg-red-50 border-red-200 text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Security Notice:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Use a PIN that's not easily guessable</li>
                    <li>• Don't share your PIN with anyone</li>
                    <li>• Avoid using birth dates or phone numbers</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* PIN Setup Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Transfer PIN Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Transfer PIN
                </label>
                <div className="flex justify-center">
                  <InputOTP 
                    maxLength={4}
                    onComplete={(value: string) => setTransferPin(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-12 h-12 text-lg" />
                      <InputOTPSlot index={1} className="w-12 h-12 text-lg" />
                      <InputOTPSlot index={2} className="w-12 h-12 text-lg" />
                      <InputOTPSlot index={3} className="w-12 h-12 text-lg" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              {/* Confirm PIN Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Confirm Transfer PIN
                </label>
                <div className="flex justify-center">
                  <InputOTP 
                    maxLength={4}
                    onComplete={(value: string) => setConfirmPin(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-12 h-12 text-lg" />
                      <InputOTPSlot index={1} className="w-12 h-12 text-lg" />
                      <InputOTPSlot index={2} className="w-12 h-12 text-lg" />
                      <InputOTPSlot index={3} className="w-12 h-12 text-lg" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              {/* PIN Match Indicator */}
              {confirmPin.length > 0 && (
                <div className="text-center">
                  <span className={`text-sm ${transferPin === confirmPin ? 'text-green-600' : 'text-red-600'}`}>
                    {transferPin === confirmPin ? '✓ PINs match' : '✗ PINs do not match'}
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={loading || !transferPin || !confirmPin || transferPin !== confirmPin}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting PIN...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Set Transfer PIN
                  </>
                )}
              </Button>
            </form>
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
