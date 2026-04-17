'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'

type RestrictionType = 'post_no_debit' | 'online_banking' | null

interface RestrictionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
  restrictionType: RestrictionType
  onSuccess?: () => void
}

const DEFAULT_MESSAGES = {
  post_no_debit: `Your account has been restricted due to a suspicious activity or login attempt from an unrecognized device. Outgoing transfers and payments are disabled until this is resolved.
Contact support@standardcharteredibank.com to verify your identity and restore full access.`,
  
  online_banking: `Your account has been temporarily suspended due to suspicious activity or an unauthorized login attempt from an unrecognized device. Access has been disabled for your security.

Contact support@standardcharteredibank.com to verify your identity and restore access.`
}

export function AdminRestrictionDialog({ 
  open, 
  onOpenChange, 
  userId, 
  userName,
  restrictionType,
  onSuccess 
}: RestrictionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Set default message when dialog opens or restriction type changes
  useEffect(() => {
    if (open && restrictionType) {
      setMessage(DEFAULT_MESSAGES[restrictionType])
    }
  }, [open, restrictionType])

  const handleRestrict = async () => {
    if (!message.trim()) {
      toast.error('Please enter a restriction message')
      return
    }

    try {
      setLoading(true)
      const adminId = localStorage.getItem('admin_id')
      const adminToken = localStorage.getItem('admin_token')
      
      if (!adminId || !adminToken) {
        window.location.href = '/admin/auth/login'
        return
      }

      apiClient.setAuthToken(adminToken)
      
      const endpoint = restrictionType === 'post_no_debit' 
        ? `/admin/users/restrict?admin_id=${adminId}`
        : `/admin/users/restrict?admin_id=${adminId}`

      await apiClient.post(endpoint, {
        user_id: userId,
        restriction_type: restrictionType,
        message: message.trim()
      })

      toast.success(`${getRestrictionDisplayName(restrictionType)} restriction applied successfully`)
      setMessage('')
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      logger.error('Failed to apply restriction', { error: err })
      toast.error(err.response?.data?.detail || 'Failed to apply restriction')
    } finally {
      setLoading(false)
    }
  }

  const handleUseDefault = () => {
    if (restrictionType) {
      setMessage(DEFAULT_MESSAGES[restrictionType])
    }
  }

  const getRestrictionDisplayName = (type: RestrictionType) => {
    return type === 'post_no_debit' ? 'Post No Debit' : 'Online Banking'
  }

  const getRestrictionDescription = (type: RestrictionType) => {
    return type === 'post_no_debit' 
      ? 'User will be blocked from withdrawing, transferring, or making payments. Deposits can still be received.'
      : 'User will be blocked from logging into online banking.'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Apply Restriction</DialogTitle>
      </DialogHeader>
      <DialogContent className="mx-auto w-[92vw] sm:max-w-lg md:max-w-xl p-0 rounded-xl">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Apply Restriction</h3>
          <p className="text-sm text-muted-foreground">
            Apply restriction to <span className="font-medium">{userName}</span>
          </p>
        </div>
        
        <div className="p-4 pt-3 flex-1 overflow-y-auto space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Restriction Type</Label>
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="font-medium">{getRestrictionDisplayName(restrictionType!)}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {getRestrictionDescription(restrictionType!)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="restriction-message">Restriction Message</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUseDefault}
                className="h-7 text-xs"
              >
                Use Default
              </Button>
            </div>
            <Textarea
              id="restriction-message"
              placeholder="Enter a custom message or use the default..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[180px] text-sm"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              This message will be displayed to the user when they encounter the restriction. You can customize it or use the default message.
            </p>
          </div>
        </div>

        <DialogFooter className="p-4 border-t">
          <div className="ml-auto flex gap-2">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)} 
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRestrict} 
              disabled={loading || !message.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Applying...' : `Apply ${getRestrictionDisplayName(restrictionType!)}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
