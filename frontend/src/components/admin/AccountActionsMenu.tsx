 'use client'
 
 import { useState } from 'react'
 import { Button } from '@/components/ui/button'
 import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
 import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'
 import { Input } from '@/components/ui/input'
 import { MoreHorizontal } from 'lucide-react'
 import { apiClient } from '@/lib/api-client'
 import { logger } from '@/lib/logger'
 
 interface Props {
   account: { id: string; status: string }
 }
 
 export function AccountActionsMenu({ account }: Props) {
   const [amountOpen, setAmountOpen] = useState<false | 'credit' | 'debit'>(false)
   const [confirmOpen, setConfirmOpen] = useState<false | 'freeze' | 'unfreeze' | 'close'>(false)
   const [amount, setAmount] = useState<string>('')
 
   async function doStatusChange(next: 'active' | 'frozen' | 'closed') {
     try {
       const adminId = localStorage.getItem('admin_id')
       if (!adminId) {
         window.location.href = '/admin/auth/login'
         return
       }
       const qs = new URLSearchParams({ admin_id: adminId })
       await apiClient.put(`/admin/accounts/status?${qs.toString()}`, {
         account_id: account.id,
         status: next,
       })
       window.location.reload()
     } catch (err: any) {
       logger.error('Failed to update account status', { error: err })
     }
   }
 
   async function doAdjustBalance(op: 'credit' | 'debit') {
     try {
       const num = parseFloat(amount)
       if (!Number.isFinite(num) || num <= 0) return
       const adminId = localStorage.getItem('admin_id')
       if (!adminId) {
         window.location.href = '/admin/auth/login'
         return
       }
       const qs = new URLSearchParams({ admin_id: adminId })
       await apiClient.put(`/admin/accounts/adjust-balance?${qs.toString()}`, {
         account_id: account.id,
         amount: num,
         operation: op,
       })
       window.location.reload()
     } catch (err: any) {
       logger.error('Failed to adjust balance', { error: err })
     }
   }
 
   const isFrozen = account.status === 'frozen'
 
   return (
     <>
       <DropdownMenu>
         <DropdownMenuTrigger asChild>
           <Button variant="ghost" size="icon" aria-label="Actions">
             <MoreHorizontal className="h-4 w-4" />
           </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end">
           <DropdownMenuItem onClick={() => setConfirmOpen(isFrozen ? 'unfreeze' : 'freeze')}>
             {isFrozen ? 'Unfreeze Account' : 'Freeze Account'}
           </DropdownMenuItem>
           <DropdownMenuItem onClick={() => setConfirmOpen('close')}>Close Account</DropdownMenuItem>
           <DropdownMenuItem onClick={() => { setAmount(''); setAmountOpen('credit') }}>Top Up Balance</DropdownMenuItem>
           <DropdownMenuItem onClick={() => { setAmount(''); setAmountOpen('debit') }}>Remove Money</DropdownMenuItem>
         </DropdownMenuContent>
       </DropdownMenu>
 
       <Dialog open={!!amountOpen} onOpenChange={(o) => setAmountOpen(o ? amountOpen : false)}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>{amountOpen === 'credit' ? 'Top Up Balance' : 'Remove Money'}</DialogTitle>
           </DialogHeader>
           <div className="space-y-2">
             <label className="text-sm">Amount</label>
             <Input placeholder="e.g. 100.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setAmountOpen(false)}>Cancel</Button>
             <Button onClick={() => { if (amountOpen) doAdjustBalance(amountOpen) }}>Confirm</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       <AlertDialog open={!!confirmOpen} onOpenChange={(o) => setConfirmOpen(o ? confirmOpen : false)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>
               {confirmOpen === 'close' ? 'Close Account?' : confirmOpen === 'freeze' ? 'Freeze Account?' : 'Unfreeze Account?'}
             </AlertDialogTitle>
             <AlertDialogDescription>
               {confirmOpen === 'close'
                 ? 'This will close the account and block further use.'
                 : confirmOpen === 'freeze'
                 ? 'This will temporarily block transfers using this account.'
                 : 'This will restore normal usage of the account.'}
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
             <AlertDialogAction
               onClick={() => {
                 if (confirmOpen === 'freeze') doStatusChange('frozen')
                 else if (confirmOpen === 'unfreeze') doStatusChange('active')
                 else doStatusChange('closed')
               }}
             >
               Confirm
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </>
   )
 }
