'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import type { UserRestriction, RestrictionType } from '@/hooks/use-user-restrictions'

interface UserRestrictionModalProps {
  open: boolean
  onClose: () => void
  restriction: UserRestriction | null
}

export function UserRestrictionModal({ open, onClose, restriction }: UserRestrictionModalProps) {
  if (!restriction) return null

  const getIcon = (type: RestrictionType) => {
    // Always show danger/alert icon regardless of type
    return <AlertTriangle className="h-8 w-8 text-red-500" />
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center space-y-2">
          <DialogTitle className="text-xl font-bold">Account Restricted</DialogTitle>
          <div className="flex items-center justify-center">
            {getIcon(restriction.restriction_type)}
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {restriction.message && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-900 whitespace-pre-wrap">{restriction.message}</p>
            </div>
          )}

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 font-medium">What you can still do:</p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              {restriction.restriction_type === 'post_no_debit' ? (
                <>
                  <li>View your account balance and transactions</li>
                  <li>Receive deposits and incoming transfers</li>
                  <li>Contact customer support for assistance: support@standardcharteredibank.com</li>
                </>
              ) : (
                <li>Contact customer support for assistance: support@standardcharteredibank.com</li>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={onClose}
            className="w-full"
            variant="outline"
          >
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
