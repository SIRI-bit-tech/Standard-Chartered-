'use client'

import React, { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock } from 'lucide-react'
import { useAuthStore, useLoadingStore } from '@/lib/store'
import { toast } from 'sonner'

interface SetupTransferPinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  email: string
  token: string
}

export function SetupTransferPinModal({ open, onOpenChange, onSuccess, email, token }: SetupTransferPinModalProps) {
  const { setUser } = useAuthStore()
  const { show, hide } = useLoadingStore()

  const [transferPin, setTransferPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!transferPin || transferPin.length !== 4) {
      setError('Please enter a 4-digit PIN')
      return
    }

    if (!confirmPin || confirmPin.length !== 4) {
      setError('Please confirm your 4-digit PIN')
      return
    }

    if (transferPin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    // Fallback email if prop is empty
    let submitEmail = email
    if (!submitEmail) {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser)
          submitEmail = parsed.email
        } catch (e) {}
      }
    }

    if (!submitEmail) {
      setError('Session data missing. Please log out and back in.')
      return
    }

    setLoading(true)
    setError('')
    show()

    try {
      const response = await apiClient.post<{ success: boolean; message: string; data?: any }>(
        '/api/v1/auth/set-transfer-pin',
        {
          email: submitEmail,
          transfer_pin: transferPin,
          verification_token: token
        },
        { 
          headers: { 
            'X-Show-Loader': '1',
            'Authorization': `Bearer ${token}`
          } 
        }
      )

      if (response.success) {
        setSuccess(true)
        toast.success('Transfer PIN set successfully!')
        
        // Update user in store to reflect PIN is now set
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser)
            userData.transfer_pin_set = true
            localStorage.setItem('user', JSON.stringify(userData))
            setUser(userData)
          } catch (e) {
            console.error('Failed to update local user data', e)
          }
        }

        // Close modal after a short delay to show success state
        setTimeout(() => {
          onSuccess()
        }, 1500)
      }
    } catch (error: any) {
      console.error('Transfer PIN error:', error)
      setError(error.response?.data?.detail || 'Failed to set transfer PIN. Please try again.')
    } finally {
      setLoading(false)
      hide()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] border-0 shadow-2xl p-0 overflow-hidden" showCloseButton={false}>
        <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-600" />
        
        <div className="p-5">
          <DialogHeader className="text-center mb-4">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">Set Transfer PIN</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Create a 4-digit secure PIN for transactions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2 px-3 bg-red-50 border-red-100 text-red-800">
                <AlertDescription className="text-[11px] font-medium leading-tight">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5 text-center">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    New PIN
                  </label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={4}
                      value={transferPin}
                      onChange={(val) => setTransferPin(val)}
                      disabled={loading || success}
                    >
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="w-10 h-12 text-lg border rounded-md" />
                        <InputOTPSlot index={1} className="w-10 h-12 text-lg border rounded-md" />
                        <InputOTPSlot index={2} className="w-10 h-12 text-lg border rounded-md" />
                        <InputOTPSlot index={3} className="w-10 h-12 text-lg border rounded-md" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <div className="space-y-1.5 text-center">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Confirm PIN
                  </label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={4}
                      value={confirmPin}
                      onChange={(val) => setConfirmPin(val)}
                      disabled={loading || success}
                    >
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="w-10 h-12 text-lg border rounded-md" />
                        <InputOTPSlot index={1} className="w-10 h-12 text-lg border rounded-md" />
                        <InputOTPSlot index={2} className="w-10 h-12 text-lg border rounded-md" />
                        <InputOTPSlot index={3} className="w-10 h-12 text-lg border rounded-md" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-bold bg-green-600 hover:bg-green-700 shadow-md transition-all active:scale-[0.98]"
                disabled={loading || success || transferPin.length !== 4 || confirmPin.length !== 4 || transferPin !== confirmPin}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Complete Setup'
                )}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
