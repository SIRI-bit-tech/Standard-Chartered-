'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { MoreHorizontal } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { ImageUpload } from '@/components/ImageUpload'

interface Props {
  account: { id: string; status: string; type?: string; wallet_id?: string | null; wallet_qrcode?: string | null }
}

export function AccountActionsMenu({ account }: Props) {
  const [amountOpen, setAmountOpen] = useState<false | 'credit' | 'debit'>(false)
  const [confirmOpen, setConfirmOpen] = useState<false | 'freeze' | 'unfreeze' | 'close'>(false)
  const [amount, setAmount] = useState<string>('')
  const [walletOpen, setWalletOpen] = useState(false)
  const [walletId, setWalletId] = useState(account.wallet_id || '')
  const [walletQrCode, setWalletQrCode] = useState<string>('')

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

  async function doUpdateWalletId() {
    try {
      if (!walletId.trim()) return
      const adminId = localStorage.getItem('admin_id')
      if (!adminId) {
        window.location.href = '/admin/auth/login'
        return
      }
      const qs = new URLSearchParams({ admin_id: adminId })
      await apiClient.put(`/admin/accounts/wallet-id?${qs.toString()}`, {
        account_id: account.id,
        wallet_id: walletId.trim(),
        wallet_qrcode: walletQrCode.trim() || null,
      })
      window.location.reload()
    } catch (err: any) {
      logger.error('Failed to update wallet ID', { error: err })
    }
  }

  const isFrozen = account.status === 'frozen'
  const isCrypto = account.type === 'crypto'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isCrypto && (
            <>
              <DropdownMenuItem onClick={() => {
                setWalletId(account.wallet_id || '');
                setWalletQrCode(account.wallet_qrcode || '');
                setWalletOpen(true)
              }}>
                {account.wallet_id ? 'Edit Wallet Details' : 'Set Wallet Details'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => setConfirmOpen(isFrozen ? 'unfreeze' : 'freeze')}>
            {isFrozen ? 'Unfreeze Account' : 'Freeze Account'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmOpen('close')}>Close Account</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setAmount(''); setAmountOpen('credit') }}>Top Up Balance</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setAmount(''); setAmountOpen('debit') }}>Remove Money</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Amount Dialog */}
      <Dialog open={!!amountOpen} onOpenChange={(o) => setAmountOpen(o ? amountOpen : false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{amountOpen === 'credit' ? 'Top Up Balance' : 'Remove Money'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm">Amount {isCrypto ? '(BTC)' : ''}</label>
              <Input placeholder={isCrypto ? "e.g. 0.5" : "e.g. 100.00"} value={amount} onChange={(e) => setAmount(e.target.value)} />
              {isCrypto && (
                <p className="text-[10px] text-muted-foreground italic">
                  Enter amount in BTC. This will be added directly to the user&apos;s BTC balance.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAmountOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (amountOpen) doAdjustBalance(amountOpen) }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet ID Dialog */}
      <Dialog open={walletOpen} onOpenChange={setWalletOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{account.wallet_id ? 'Edit Wallet ID' : 'Set Wallet ID'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm">Wallet ID</label>
              <Input
                placeholder="e.g. 0x1234...abcd"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <ImageUpload
                label="Wallet QR Code"
                value={walletQrCode}
                onChange={setWalletQrCode}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Upload a QR code image for this wallet address.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletOpen(false)}>Cancel</Button>
            <Button onClick={doUpdateWalletId} disabled={!walletId.trim()}>
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
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
