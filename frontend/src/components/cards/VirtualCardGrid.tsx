'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VirtualCard3D } from './VirtualCard3D'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import type { VirtualCardSummary } from '@/types'
import { Copy, Lock, Unlock, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ConfirmModal } from '@/components/ui/confirm-modal'

interface Props {
  cards: VirtualCardSummary[]
  onRefresh: () => void
}

export function VirtualCardGrid({ cards, onRefresh }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<VirtualCardSummary | null>(null)
  const { toast } = useToast()

  async function freeze(card: VirtualCardSummary) {
    setBusy(card.id)
    try {
      await apiClient.post(`/api/v1/cards/${card.id}/block`, { reason: 'user freeze' })
      onRefresh()
      toast({ title: 'Card frozen', description: `“${card.card_name}” is now blocked.` })
    } catch (e) {
      logger.error('Freeze card failed', { error: e })
      toast({ title: 'Freeze failed', description: 'Unable to block the card', variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  async function unfreeze(card: VirtualCardSummary) {
    setBusy(card.id)
    try {
      await apiClient.post(`/api/v1/cards/${card.id}/unblock`, {})
      onRefresh()
      toast({ title: 'Card unfrozen', description: `“${card.card_name}” is now active.` })
    } catch (e) {
      logger.error('Unfreeze card failed', { error: e })
      toast({ title: 'Unfreeze failed', description: 'Unable to activate the card', variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  async function executeRemove(card: VirtualCardSummary) {
    setBusy(card.id)
    try {
      await apiClient.delete(`/api/v1/cards/${card.id}`)
      onRefresh()
      toast({ title: 'Card Deleted', description: `“${card.card_name}” has been permanently removed.` })
    } catch (e) {
      logger.error('Delete card failed', { error: e })
      toast({ title: 'Delete Failed', description: 'Unable to cancel the card', variant: 'destructive' })
    } finally {
      setBusy(null)
      setShowDeleteConfirm(null)
    }
  }

  function copyNumber(card: VirtualCardSummary) {
    try {
      const num = (card.card_number || '').replace(/\s+/g, '')
      navigator.clipboard.writeText(num)
      toast({ title: 'Copied', description: 'Card number copied to clipboard' })
    } catch {}
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div key={card.id} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">{card.card_name}</div>
            <Badge variant="outline" className="border-0 text-xs capitalize">
              {card.status === 'suspended' ? 'frozen' : card.status}
            </Badge>
          </div>
          <div className="mt-3">
            <VirtualCard3D card={card} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => copyNumber(card)}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            {card.status === 'blocked' || card.status === 'suspended' ? (
              <Button variant="ghost" size="sm" className="gap-2" disabled={!!busy} onClick={() => unfreeze(card)}>
                <Unlock className="h-4 w-4" />
                Unfreeze
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="gap-2" disabled={!!busy} onClick={() => freeze(card)}>
                <Lock className="h-4 w-4" />
                Freeze
              </Button>
            )}
            <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={!!busy} onClick={() => setShowDeleteConfirm(card)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      ))}

      <ConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && executeRemove(showDeleteConfirm)}
        title="Delete Virtual Card?"
        description={`Are you sure you want to delete "${showDeleteConfirm?.card_name}"? This action is permanent and cannot be undone.`}
        confirmText="Yes, Delete Totally"
        variant="destructive"
      />
    </div>
  )
}
