 'use client'
 
 import { useState } from 'react'
 import { Button } from '@/components/ui/button'
 import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
 import { Input } from '@/components/ui/input'
  import { apiClient } from '@/lib/api-client'
 import { logger } from '@/lib/logger'
  import type { AdminTransactionRow, TransferReceipt } from '@/types'
 import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
  import { useEffect } from 'react'
 
 export function AdminTransactionActions({ tx }: { tx: AdminTransactionRow }) {
   const [open, setOpen] = useState(false)
   const [desc, setDesc] = useState(tx.description || '')
   const [createdAt, setCreatedAt] = useState(tx.created_at ? tx.created_at.substring(0, 16) : '')
   const [busy, setBusy] = useState(false)
   const [reverseOpen, setReverseOpen] = useState(false)
    const [receipt, setReceipt] = useState<TransferReceipt | null>(null)
    const [amount, setAmount] = useState<string>('')
    const [processedAt, setProcessedAt] = useState<string>('')
    const [recipientName, setRecipientName] = useState<string>('')
    const [destinationAccount, setDestinationAccount] = useState<string>('')
    const currency = receipt?.currency || tx.currency
 
    useEffect(() => {
      let cancelled = false
      async function load() {
        if (!tx.transfer_id) return
        try {
          const r = await apiClient.get<{ success: boolean; data: TransferReceipt }>(`/api/v1/transfers/${tx.transfer_id}`)
          if (!cancelled && r.success) {
            setReceipt(r.data)
            setDesc(r.data.description || tx.description || '')
            setAmount(String(r.data.amount ?? tx.amount))
            setCreatedAt((r.data.created_at || tx.created_at || '').toString().slice(0, 16))
            setProcessedAt((r.data.processed_at || '')?.toString().slice(0, 16) || '')
            setRecipientName(r.data.recipient_name || '')
            setDestinationAccount('')
          }
        } catch {}
      }
      if (open && tx.transfer_id) load()
      return () => { cancelled = true }
    }, [open, tx.transfer_id])
 
   async function saveEdits() {
     try {
       setBusy(true)
      if (tx.transfer_id) {
        await apiClient.put(`/admin/transfers/edit`, {
            transfer_id: tx.transfer_id,
            description: desc,
            amount: amount ? parseFloat(amount) : undefined,
            created_at: createdAt ? new Date(createdAt).toISOString() : undefined,
            processed_at: processedAt ? new Date(processedAt).toISOString() : undefined,
            recipient_name: recipientName || undefined,
            destination_account_number: destinationAccount || undefined,
        })
      } else {
        await apiClient.put(`/admin/transactions/edit`, {
            transaction_id: tx.id,
            description: desc,
            created_at: createdAt ? new Date(createdAt).toISOString() : undefined,
        })
      }
       setOpen(false)
       window.location.reload()
     } catch (e) {
       logger.error('Failed to edit transaction', { error: e })
     } finally {
       setBusy(false)
     }
   }
 
   async function reverseTransfer() {
     if (!tx.transfer_id) return
     try {
       setBusy(true)
      await apiClient.post(`/admin/transfers/reverse`, {
         transfer_id: tx.transfer_id,
       })
       setReverseOpen(false)
       setOpen(false)
       window.location.reload()
     } catch (e) {
       logger.error('Failed to reverse transfer', { error: e })
     } finally {
       setBusy(false)
     }
   }
 
   return (
     <>
       <DropdownMenu>
         <DropdownMenuTrigger asChild>
           <Button variant="ghost" size="sm">Actions</Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end">
           <DropdownMenuItem onClick={() => setOpen(true)}>Edit Details</DropdownMenuItem>
           {tx.transfer_id ? (
             <DropdownMenuItem onClick={() => { setOpen(true); setReverseOpen(true) }}>
               Reverse Transfer
             </DropdownMenuItem>
           ) : null}
         </DropdownMenuContent>
       </DropdownMenu>
 
       <Dialog open={open} onOpenChange={setOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Transaction Actions</DialogTitle>
           </DialogHeader>
           <div className="space-y-3">
             <div>
               <label className="text-sm">Description</label>
               <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
             </div>
             {tx.transfer_id ? (
               <>
                 <div>
                   <label className="text-sm">Amount ({currency})</label>
                   <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                 </div>
                 <div>
                   <label className="text-sm">Recipient Name</label>
                   <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g. Jonathan Arrington Smith" />
                 </div>
                 <div>
                   <label className="text-sm">Destination Account (Number)</label>
                   <Input value={destinationAccount} onChange={(e) => setDestinationAccount(e.target.value)} placeholder="Enter account number to route to" />
                 </div>
               </>
             ) : null}
             <div>
               <label className="text-sm">Created At</label>
               <Input type="datetime-local" value={createdAt} onChange={(e) => setCreatedAt(e.target.value)} />
             </div>
             {tx.transfer_id ? (
               <div>
                 <label className="text-sm">Processed At</label>
                 <Input type="datetime-local" value={processedAt} onChange={(e) => setProcessedAt(e.target.value)} />
               </div>
             ) : null}
           </div>
           <DialogFooter className="gap-2 w-full justify-between">
             <div className="flex items-center gap-2">
               {tx.transfer_id ? (
                 <Button variant="outline" className="text-red-600 border-red-200 hover:text-red-700" onClick={() => setReverseOpen(true)} disabled={busy}>
                   Reverse Transfer
                 </Button>
               ) : null}
             </div>
             <div className="flex items-center gap-2">
               <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Close</Button>
               <Button onClick={saveEdits} disabled={busy}>Save Changes</Button>
             </div>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       <AlertDialog open={reverseOpen} onOpenChange={setReverseOpen}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Reverse this transfer?</AlertDialogTitle>
           </AlertDialogHeader>
           <p className="text-sm text-muted-foreground">
             This will credit the sender and, if applicable, debit the recipient. This action cannot be undone.
           </p>
           <AlertDialogFooter>
             <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
             <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={reverseTransfer} disabled={busy}>
               Confirm Reverse
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </>
   )
 }
