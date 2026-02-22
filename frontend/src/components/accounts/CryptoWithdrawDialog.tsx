'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCryptoPrice } from '@/hooks/use-crypto-price'
import { formatCurrency } from '@/lib/utils'
import { TransferPinModal } from '@/components/transfers/transfer-pin-modal'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import type { Account } from '@/types'
import { colors } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface CryptoWithdrawDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    account: Account
}

export function CryptoWithdrawDialog({ open, onOpenChange, account }: CryptoWithdrawDialogProps) {
    const [btcAmount, setBtcAmount] = useState('')
    const [address, setAddress] = useState('')
    const [mode, setMode] = useState<'external' | 'internal'>('external')
    const [destinationAccountId, setDestinationAccountId] = useState('')
    const [userAccounts, setUserAccounts] = useState<Account[]>([])
    const [loadingAccounts, setLoadingAccounts] = useState(false)
    const [pinOpen, setPinOpen] = useState(false)
    const [pinError, setPinError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const { price: btcPrice } = useCryptoPrice('bitcoin')
    const { toast } = useToast()

    useEffect(() => {
        if (open) {
            loadUserAccounts()
        }
    }, [open])

    const loadUserAccounts = async () => {
        setLoadingAccounts(true)
        try {
            const res = await apiClient.get<{ success: boolean; data: Account[] }>('/api/v1/accounts/')
            if (res.success) {
                // Filter out current account and only show checking/savings
                const filtered = res.data.filter(a => a.id !== account.id && a.type !== 'crypto')
                setUserAccounts(filtered)
                if (filtered.length > 0) setDestinationAccountId(filtered[0].id)
            }
        } catch (e) {
            console.error('Failed to load accounts:', e)
        } finally {
            setLoadingAccounts(false)
        }
    }

    const numAmount = parseFloat(btcAmount) || 0
    const usdValue = numAmount * (btcPrice || 0)

    const btcBalance = account.balance

    const handleWithdrawClick = () => {
        if (numAmount <= 0) {
            toast({ title: 'Invalid amount', description: 'Please enter a valid BTC amount.', variant: 'destructive' })
            return
        }
        if (numAmount > btcBalance) {
            toast({ title: 'Insufficient funds', description: 'You do not have enough BTC for this withdrawal.', variant: 'destructive' })
            return
        }
        if (mode === 'external' && !address.trim()) {
            toast({ title: 'Address required', description: 'Please enter a destination wallet address.', variant: 'destructive' })
            return
        }
        if (mode === 'internal' && !destinationAccountId) {
            toast({ title: 'Destination required', description: 'Please select a destination account.', variant: 'destructive' })
            return
        }
        setPinOpen(true)
    }

    const handlePinConfirm = async (pin: string) => {
        setSubmitting(true)
        try {
            // 1. Verify PIN
            await apiClient.post('/api/v1/auth/verify-transfer-pin', { transfer_pin: pin })

            // 2. Perform withdrawal
            const res = await apiClient.post<any>('/api/v1/transfers/crypto-withdraw', {
                from_account_id: account.id,
                amount_btc: numAmount,
                destination_address: mode === 'external' ? address.trim() : null,
                destination_account_id: mode === 'internal' ? destinationAccountId : null,
                transfer_pin: pin
            })

            if (res.success) {
                toast({ title: 'Withdrawal Successful', description: 'Your withdrawal request has been submitted for processing.' })
                onOpenChange(false)
                window.location.reload()
            }
        } catch (e: any) {
            const msg = e.response?.data?.detail || 'Withdrawal failed'
            setPinError(msg)
            throw e
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Withdraw or Convert BTC</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="external">External Wallet</TabsTrigger>
                                <TabsTrigger value="internal">My Accounts</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="rounded-lg bg-gray-50 p-4 text-xs space-y-2">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                <span className="text-gray-500 font-medium uppercase tracking-wider">Available Assets</span>
                                <span className="font-bold text-gray-900 text-sm">{btcBalance.toFixed(8)} BTC</span>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                                <span className="text-gray-500 font-medium uppercase tracking-wider">USD Value</span>
                                <span className="font-bold text-lg" style={{ color: colors.primary }}>{formatCurrency(account.balance * (btcPrice || 0), 'USD')}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 text-right italic">1 BTC = {formatCurrency(btcPrice || 0, 'USD')}</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="btc-amount" className="text-sm font-semibold">Amount to {mode === 'external' ? 'Withdraw' : 'Convert'} (BTC)</Label>
                            <div className="relative">
                                <Input
                                    id="btc-amount"
                                    placeholder="0.00000000"
                                    type="number"
                                    step="0.00000001"
                                    value={btcAmount}
                                    onChange={(e) => setBtcAmount(e.target.value)}
                                    className="pr-12 text-lg font-mono h-12"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">BTC</div>
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <p className="text-xs font-medium" style={{ color: colors.primary }}>
                                    ≈ {formatCurrency(usdValue, 'USD')}
                                </p>
                                <button
                                    className="text-[10px] uppercase font-bold text-gray-400 hover:text-gray-600 transition-colors"
                                    onClick={() => setBtcAmount(btcBalance.toString())}
                                >
                                    Use Max
                                </button>
                            </div>
                        </div>

                        {mode === 'external' ? (
                            <div className="space-y-2">
                                <Label htmlFor="destination" className="text-sm font-semibold">Destination BTC Address</Label>
                                <Input
                                    id="destination"
                                    placeholder="Paste external BTC address here"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="font-mono text-xs"
                                />
                                <p className="text-[10px] text-gray-400 leading-relaxed">
                                    Notice: Blockchain transfers are irreversible. Please verify the address before confirming.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Destination Internal Account</Label>
                                {loadingAccounts ? (
                                    <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Loading your accounts...
                                    </div>
                                ) : (
                                    <Select value={destinationAccountId} onValueChange={setDestinationAccountId}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select an account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {userAccounts.map((a) => (
                                                <SelectItem key={a.id} value={a.id}>
                                                    <div className="flex flex-col items-start gap-0.5">
                                                        <span className="font-semibold text-xs">{a.nickname || a.type.toUpperCase()}</span>
                                                        <span className="text-[10px] text-gray-400">
                                                            {formatCurrency(a.balance, a.currency)} (****{a.account_number.slice(-4)})
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                            {userAccounts.length === 0 && (
                                                <SelectItem value="none" disabled>No other accounts available</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                )}
                                <p className="text-[10px] text-gray-400 leading-relaxed">
                                    Your BTC will be converted to USD at the current market rate and deposited instantly.
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0 font-semibold uppercase tracking-wider">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
                        <Button
                            onClick={handleWithdrawClick}
                            disabled={submitting || (mode === 'internal' && userAccounts.length === 0)}
                            className="px-8"
                            style={{ backgroundColor: colors.primary }}
                        >
                            {submitting ? 'Processing...' : `Confirm ${mode === 'external' ? 'Withdrawal' : 'Conversion'}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <TransferPinModal
                open={pinOpen}
                onOpenChange={setPinOpen}
                onConfirm={handlePinConfirm}
                error={pinError}
                onClearError={() => setPinError('')}
            />
        </>
    )
}
