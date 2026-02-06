'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

interface ApprovalItem {
  id: string
  type: string
  user_email: string
  amount?: number
  status: string
  created_at: string
  details: string
}

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState('transfers')
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState<string | null>(null)

  const tabs = [
    { id: 'transfers', label: 'Pending Transfers' },
    { id: 'deposits', label: 'Pending Deposits' },
    { id: 'cards', label: 'Pending Virtual Cards' },
  ]

  const handleApprove = async (itemId: string) => {
    setApproving(itemId)
    try {
      const adminId = localStorage.getItem('admin_id')
      const endpoint = activeTab === 'transfers' 
        ? '/admin/transfers/approve'
        : activeTab === 'deposits'
        ? '/admin/deposits/approve'
        : '/admin/cards/approve'

      await apiClient.post(endpoint, {
        admin_id: adminId,
        [activeTab === 'transfers' ? 'transfer_id' : activeTab === 'deposits' ? 'deposit_id' : 'card_id']: itemId,
        notes: 'Approved by admin'
      })

      setItems(items.filter(item => item.id !== itemId))
      logger.debug(`${activeTab} item approved: ${itemId}`)
    } catch (err: any) {
      logger.error('Approval failed', { error: err })
    } finally {
      setApproving(null)
    }
  }

  const handleDecline = async (itemId: string) => {
    setApproving(itemId)
    try {
      const adminId = localStorage.getItem('admin_id')
      const endpoint = activeTab === 'transfers'
        ? '/admin/transfers/decline'
        : activeTab === 'deposits'
        ? '/admin/deposits/decline'
        : '/admin/cards/decline'

      await apiClient.post(endpoint, {
        admin_id: adminId,
        [activeTab === 'transfers' ? 'transfer_id' : activeTab === 'deposits' ? 'deposit_id' : 'card_id']: itemId,
        reason: 'Declined by admin'
      })

      setItems(items.filter(item => item.id !== itemId))
      logger.debug(`${activeTab} item declined: ${itemId}`)
    } catch (err: any) {
      logger.error('Decline failed', { error: err })
    } finally {
      setApproving(null)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Pending Approvals</h2>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Approval Items */}
      <div className="grid gap-4">
        {items.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No pending {activeTab} to review</p>
          </Card>
        ) : (
          items.map(item => (
            <Card key={item.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{item.user_email}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.details}</p>
                  {item.amount && (
                    <p className="text-lg font-bold text-primary mt-2">${item.amount.toFixed(2)}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={() => handleApprove(item.id)}
                    disabled={approving === item.id}
                    className="bg-success hover:bg-success-dark text-white"
                  >
                    {approving === item.id ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <CheckCircle size={18} />
                    )}
                  </Button>
                  <Button
                    onClick={() => handleDecline(item.id)}
                    disabled={approving === item.id}
                    className="bg-error hover:bg-error-dark text-white"
                  >
                    {approving === item.id ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <XCircle size={18} />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
