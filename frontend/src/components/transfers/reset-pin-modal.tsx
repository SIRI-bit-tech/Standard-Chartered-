'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { apiClient } from '@/lib/api-client'
import { colors } from '@/types'

interface ResetPinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResetPinModal({ open, onOpenChange }: ResetPinModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const close = () => {
    setStep(1)
    setEmail('')
    setCode('')
    setToken(null)
    setPin1('')
    setPin2('')
    setLoading(false)
    setError(null)
    setInfo(null)
    onOpenChange(false)
  }

  const sendCode = async () => {
    if (!email) return
    setLoading(true); setError(null); setInfo(null)
    try {
      await apiClient.post<{ success: boolean; message: string }>('/api/v1/auth/start-pin-reset', { email })
      setInfo('We sent a 6-digit code to your email')
      setStep(2)
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to send reset code'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async () => {
    if (code.length !== 6) return
    setLoading(true); setError(null); setInfo(null)
    try {
      const res = await apiClient.post('/api/v1/auth/confirm-pin-reset', { email, code }) as { success: boolean; data?: { token: string } }
      if (res?.success && res?.data?.token) {
        setToken(res.data.token)
        setStep(3)
      } else {
        setError('Invalid code')
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Invalid or expired code'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const setNewPin = async () => {
    if (pin1.length !== 4 || pin2.length !== 4 || pin1 !== pin2 || !token) {
      setError(pin1 !== pin2 ? 'PINs do not match' : 'Enter a valid 4-digit PIN')
      return
    }
    setLoading(true); setError(null); setInfo(null)
    try {
      const res = await apiClient.post('/api/v1/auth/complete-pin-reset', { email, token, new_pin: pin1 }) as { success: boolean }
      if (res?.success) {
        setInfo('Your transfer PIN has been reset. You can now try your transfer again.')
        // Auto-close after short delay
        setTimeout(close, 1200)
      } else {
        setError('Failed to reset PIN')
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to reset PIN'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); else onOpenChange(next) }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset Transfer PIN</DialogTitle>
          <DialogDescription>
            {step === 1 && 'Enter your account email to receive a reset code.'}
            {step === 2 && 'Enter the 6-digit code sent to your email.'}
            {step === 3 && 'Set a new 4-digit transfer PIN.'}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm" style={{ color: colors.error }}>{error}</p>}
        {info && <p className="text-sm" style={{ color: colors.success }}>{info}</p>}
        {step === 1 && (
          <div className="space-y-3">
            <Input placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button onClick={sendCode} disabled={loading || !email}>Send Code</Button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup className="gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} className="h-10 w-10" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <Button onClick={verifyCode} disabled={loading || code.length !== 6}>Verify Code</Button>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm" style={{ color: colors.textSecondary }}>New PIN</label>
              <InputOTP maxLength={4} value={pin1} onChange={setPin1}>
                <InputOTPGroup className="gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} className="h-10 w-10" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="space-y-2">
              <label className="text-sm" style={{ color: colors.textSecondary }}>Confirm PIN</label>
              <InputOTP maxLength={4} value={pin2} onChange={setPin2}>
                <InputOTPGroup className="gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} className="h-10 w-10" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={setNewPin} disabled={loading || pin1.length !== 4 || pin2.length !== 4}>Set New PIN</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
