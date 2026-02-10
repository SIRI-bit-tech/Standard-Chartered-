'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Loader2, Lock } from 'lucide-react'
import { colors } from '@/types'

interface TransferPinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (pin: string) => Promise<void>
  error?: string
  onClearError?: () => void
}

/** Modal for entering 4-digit transfer PIN before confirming transfer. */
export function TransferPinModal({
  open,
  onOpenChange,
  onConfirm,
  error,
  onClearError,
}: TransferPinModalProps) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (pin.length !== 4) return
    setLoading(true)
    try {
      await onConfirm(pin)
      setPin('')
      onOpenChange(false)
    } catch {
      // Error shown by parent
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPin('')
      onClearError?.()
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" style={{ color: colors.primary }} />
            Enter Transfer PIN
          </DialogTitle>
          <DialogDescription>
            Enter your 4-digit PIN to authorize this transfer.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {error && (
            <p className="text-sm font-medium" style={{ color: colors.error }}>
              {error}
            </p>
          )}
          <InputOTP
            maxLength={4}
            value={pin}
            onChange={(value) => setPin(value)}
          >
            <InputOTPGroup className="gap-2">
              <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
              <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
              <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
              <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
            </InputOTPGroup>
          </InputOTP>
          <Button
            className="w-full"
            onClick={handleConfirm}
            disabled={pin.length !== 4 || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
