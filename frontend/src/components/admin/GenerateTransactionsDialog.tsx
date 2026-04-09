'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Account } from '@/types'

interface GenerateTransactionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  accounts: Account[]
  onSuccess: () => void
}

interface PreviewData {
  sample_transactions: Array<{
    type: string
    amount: number
    description: string
    created_at: string
    running_balance?: number
  }>
  summary: {
    total_transactions: number
    debit_count: number
    credit_count: number
    total_debits: number
    total_credits: number
    starting_balance: number
    closing_balance: number
    net_change: number
  }
}

export function GenerateTransactionsDialog({
  open,
  onOpenChange,
  userId,
  accounts,
  onSuccess
}: GenerateTransactionsDialogProps) {
  const [step, setStep] = useState<'form' | 'preview'>('form')
  const [loading, setLoading] = useState(false)
  
  // Form state
  const [accountId, setAccountId] = useState('')
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [startingBalance, setStartingBalance] = useState('')
  const [closingBalance, setClosingBalance] = useState('')
  const [transactionCount, setTransactionCount] = useState('')
  
  // Preview state
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  
  // Validation
  const [validationError, setValidationError] = useState('')

  const validateForm = (): boolean => {
    setValidationError('')
    
    if (!accountId) {
      setValidationError('Please select an account')
      return false
    }
    
    if (!startDate || !endDate) {
      setValidationError('Please select both start and end dates')
      return false
    }
    
    if (endDate < startDate) {
      setValidationError('End date must be after start date')
      return false
    }
    
    const starting = parseFloat(startingBalance)
    const closing = parseFloat(closingBalance)
    const count = parseInt(transactionCount)
    
    if (isNaN(starting) || starting < 0) {
      setValidationError('Starting balance must be a positive number')
      return false
    }
    
    if (isNaN(closing) || closing < 0) {
      setValidationError('Closing balance must be a positive number')
      return false
    }
    
    if (isNaN(count) || count < 1 || count > 1000) {
      setValidationError('Transaction count must be between 1 and 1000')
      return false
    }
    
    // Check if average transaction amount is reasonable
    const difference = Math.abs(closing - starting)
    const avgPerTransaction = difference / count
    
    if (avgPerTransaction < 5) {
      setValidationError(`Average transaction amount ($${avgPerTransaction.toFixed(2)}) is too small. Increase balance difference or reduce transaction count.`)
      return false
    }
    
    if (avgPerTransaction > 100000) {
      setValidationError(`Average transaction amount ($${avgPerTransaction.toFixed(2)}) is too large. This may look suspicious.`)
      return false
    }
    
    return true
  }

  const handlePreview = async () => {
    if (!validateForm()) return
    
    setLoading(true)
    try {
      const response: any = await apiClient.post(`/admin/users/${userId}/transactions/preview`, {
        start_date: startDate?.toISOString(),
        end_date: endDate?.toISOString(),
        starting_balance: parseFloat(startingBalance),
        closing_balance: parseFloat(closingBalance),
        transaction_count: parseInt(transactionCount),
        preview_count: 10
      })
      
      setPreviewData(response.data)
      setStep('preview')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate preview')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const response: any = await apiClient.post(`/admin/users/${userId}/transactions/generate`, {
        account_id: accountId,
        start_date: startDate?.toISOString(),
        end_date: endDate?.toISOString(),
        starting_balance: parseFloat(startingBalance),
        closing_balance: parseFloat(closingBalance),
        transaction_count: parseInt(transactionCount),
        currency: 'USD'
      })
      
      toast.success(response.data.message)
      onSuccess()
      handleClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate transactions')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep('form')
    setAccountId('')
    setStartDate(undefined)
    setEndDate(new Date())
    setStartingBalance('')
    setClosingBalance('')
    setTransactionCount('')
    setPreviewData(null)
    setValidationError('')
    onOpenChange(false)
  }

  const handleBack = () => {
    setStep('form')
    setPreviewData(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>Auto-Generate Transaction History</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Account Selection */}
              <div className="space-y-2">
                <Label htmlFor="account">Account</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.type.charAt(0).toUpperCase() + account.type.slice(1)} - {account.account_number} (${account.balance.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        value={startDate}
                        onChange={setStartDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        value={endDate}
                        onChange={(date) => date && setEndDate(date)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Balance Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="starting-balance">Starting Balance ($)</Label>
                  <Input
                    id="starting-balance"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="5000.00"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="closing-balance">Closing Balance ($)</Label>
                  <Input
                    id="closing-balance"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="8500.00"
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                  />
                </div>
              </div>

              {/* Transaction Count */}
              <div className="space-y-2">
                <Label htmlFor="transaction-count">Number of Transactions</Label>
                <Input
                  id="transaction-count"
                  type="number"
                  min="1"
                  max="1000"
                  placeholder="50"
                  value={transactionCount}
                  onChange={(e) => setTransactionCount(e.target.value)}
                />
                <p className="text-sm text-gray-500">Maximum: 1000 transactions</p>
              </div>

              {/* Validation Error */}
              {validationError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{validationError}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handlePreview} disabled={loading}>
                {loading ? 'Loading...' : 'Preview Transactions'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Preview Generated Transactions</DialogTitle>
            </DialogHeader>

            {previewData && (
              <div className="space-y-4 py-4">
                {/* Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Total Transactions: {previewData.summary.total_transactions}</div>
                    <div>Net Change: ${previewData.summary.net_change.toLocaleString()}</div>
                    <div>Debits: {previewData.summary.debit_count} (-${previewData.summary.total_debits.toLocaleString()})</div>
                    <div>Credits: {previewData.summary.credit_count} (+${previewData.summary.total_credits.toLocaleString()})</div>
                    <div>Starting Balance: ${previewData.summary.starting_balance.toLocaleString()}</div>
                    <div>Closing Balance: ${previewData.summary.closing_balance.toLocaleString()}</div>
                  </div>
                </div>

                {/* Sample Transactions */}
                <div>
                  <h3 className="font-semibold mb-2">Sample Transactions (showing {previewData.sample_transactions.length} of {previewData.summary.total_transactions})</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Description</th>
                          <th className="text-right p-2">Amount</th>
                          <th className="text-right p-2">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.sample_transactions.map((txn, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">{format(new Date(txn.created_at), 'MMM dd')}</td>
                            <td className="p-2">{txn.description}</td>
                            <td className={`p-2 text-right ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                              {txn.type === 'credit' ? '+' : '-'}${txn.amount.toLocaleString()}
                            </td>
                            <td className="p-2 text-right">${txn.running_balance?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleBack}>Back to Edit</Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? 'Generating...' : 'Confirm & Generate'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
