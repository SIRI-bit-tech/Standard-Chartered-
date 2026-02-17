'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface SessionTimeoutModalProps {
  open: boolean
  secondsRemaining: number
  onStaySignedIn: () => void
  onLogout: () => void
}

export function SessionTimeoutModal({ open, secondsRemaining, onStaySignedIn, onLogout }: SessionTimeoutModalProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You’ve been inactive for a while. For your security, you’ll be signed out soon.
            Session expires in {Math.max(0, secondsRemaining)} second{secondsRemaining === 1 ? '' : 's'}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={onLogout}>Logout</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={onStaySignedIn}>Stay signed in</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
