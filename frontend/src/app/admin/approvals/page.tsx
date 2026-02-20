'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ApprovalItem {
  id: string
  type: string
  user_email: string
  amount?: number
  status: string
  created_at: string
  details: string
  name_on_check?: string
  front_image_url?: string
}

function ApprovalsContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'transfers'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState<string | null>(null)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const adminId = localStorage.getItem('admin_id')
      let endpoint = ''
      if (activeTab === 'transfers') endpoint = '/admin/transfers/pending'
      else if (activeTab === 'deposits') endpoint = '/admin/deposits/list?status=pending'
      else if (activeTab === 'cards') endpoint = '/admin/cards/list?status=pending'
      else if (activeTab === 'loans') endpoint = '/admin/loans/applications?status=submitted'

      const res = await apiClient.get<any>(endpoint, { params: { admin_id: adminId } })
      if (res.success) {
        setItems(res.data || res.data.items || [])
      }
    } catch (err) {
      logger.error(`Failed to fetch ${activeTab}`, { error: err })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [activeTab])

  const tabs = [
    { id: 'transfers', label: 'Pending Transfers' },
    { id: 'deposits', label: 'Pending Deposits' },
    { id: 'cards', label: 'Pending Virtual Cards' },
    { id: 'loans', label: 'Pending Loans' },
  ]

  const handleApprove = async (itemId: string) => {
    const adminId = localStorage.getItem('admin_id')
    if (!adminId) {
      toast.error('Admin session expired. Please login again.')
      return
    }

    setApproving(itemId)
    try {
      const endpoint = activeTab === 'transfers'
        ? '/admin/transfers/approve'
        : activeTab === 'deposits'
          ? '/admin/deposits/approve'
          : activeTab === 'cards'
            ? '/admin/cards/approve'
            : '/admin/loans/approve'

      const idField = activeTab === 'transfers'
        ? 'transfer_id'
        : activeTab === 'deposits'
          ? 'deposit_id'
          : activeTab === 'cards'
            ? 'card_id'
            : 'application_id'

      await apiClient.post(endpoint, {
        [idField]: itemId,
        notes: 'Approved by admin'
      }, {
        params: { admin_id: adminId }
      })

      setItems(items.filter(item => item.id !== itemId))
      toast.success(`${activeTab.slice(0, -1)} approved successfully`)
      logger.debug(`${activeTab} item approved: ${itemId}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Approval failed')
      logger.error('Approval failed', { error: err })
    } finally {
      setApproving(null)
    }
  }

  const handleDecline = async (itemId: string) => {
    const adminId = localStorage.getItem('admin_id')
    if (!adminId) {
      toast.error('Admin session expired. Please login again.')
      return
    }

    setApproving(itemId)
    try {
      const endpoint = activeTab === 'transfers'
        ? '/admin/transfers/decline'
        : activeTab === 'deposits'
          ? '/admin/deposits/decline'
          : activeTab === 'cards'
            ? '/admin/cards/decline'
            : '/admin/loans/decline'

      const idField = activeTab === 'transfers'
        ? 'transfer_id'
        : activeTab === 'deposits'
          ? 'deposit_id'
          : activeTab === 'cards'
            ? 'card_id'
            : 'application_id'

      await apiClient.post(endpoint, {
        [idField]: itemId,
        reason: 'Declined by admin'
      }, {
        params: { admin_id: adminId }
      })

      setItems(items.filter(item => item.id !== itemId))
      toast.info(`${activeTab.slice(0, -1)} declined`)
      logger.debug(`${activeTab} item declined: ${itemId}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Decline failed')
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
            className={`px-4 py-2 font-medium transition-colors ${activeTab === tab.id
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : (
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

                    {item.name_on_check && (
                      <p className="text-sm text-foreground mt-1">
                        <span className="font-medium">Name on Check:</span> {item.name_on_check}
                      </p>
                    )}

                    {item.front_image_url && (
                      <div className="mt-3 mb-2">
                        <p className="text-xs text-muted-foreground mb-1">Check Image:</p>
                        <a href={item.front_image_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={item.front_image_url}
                            alt="Check Front"
                            className="h-32 object-contain border rounded bg-muted"
                          />
                        </a>
                      </div>
                    )}

                    {item.amount && (
                      <p className="text-lg font-bold text-primary mt-2">${item.amount.toLocaleString()}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 ml-4">
                    <Button
                      size="default"
                      onClick={() => handleApprove(item.id)}
                      disabled={!!approving}
                      className="bg-[#10b981] hover:bg-[#059669] text-white shadow-md flex items-center gap-2 min-w-[110px]"
                    >
                      {approving === item.id ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <CheckCircle size={18} />
                      )}
                      <span>Approve</span>
                    </Button>
                    <Button
                      size="default"
                      onClick={() => handleDecline(item.id)}
                      disabled={!!approving}
                      className="bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-md flex items-center gap-2 min-w-[110px]"
                    >
                      {approving === item.id ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <XCircle size={18} />
                      )}
                      <span>Decline</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    }>
      <ApprovalsContent />
    </Suspense>
  )
}
