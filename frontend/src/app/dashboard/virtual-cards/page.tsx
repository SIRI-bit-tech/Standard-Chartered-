'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VirtualCardGrid } from '@/components/cards/VirtualCardGrid'
import { VirtualCardApply } from '@/components/cards/VirtualCardApply'
import type { VirtualCardSummary } from '@/types'
import { CreditCard, PlusIcon } from 'lucide-react'
import { colors } from '@/types'
import { useAuthStore } from '@/lib/store'
import { useUserRealtime } from '@/hooks/use-user-realtime'
import { Spinner } from '@/components/ui/spinner'

export default function VirtualCardsPage() {
  const [cards, setCards] = useState<VirtualCardSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [metrics, setMetrics] = useState({ total: 0, active: 0, blocked: 0 })
  const { user } = useAuthStore()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken')
      if (token) apiClient.setAuthToken(token)
    }
    fetchCards()
  }, [])

  async function fetchCards() {
    try {
      const response = await apiClient.get<{ cards: VirtualCardSummary[]; total_count: number; active_count: number; blocked_count: number }>(
        `/api/v1/cards/list`,
      )
      setCards(response.cards ?? [])
      setMetrics({
        total: response.total_count ?? response.cards?.length ?? 0,
        active: response.active_count ?? 0,
        blocked: response.blocked_count ?? 0,
      })
    } catch (e) {
      console.error('Failed to fetch virtual cards:', e)
    } finally {
      setLoading(false)
    }
  }

  const channelName = user?.id ? `banking:cards:${user.id}` : undefined
  useUserRealtime(channelName as string, (payload) => {
    if (payload?.type === 'card_status') {
      fetchCards()
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            Virtual Cards
          </h1>
          <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
            Create and manage virtual cards for secure online payments
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="gap-2" disabled={loading}>
          <PlusIcon className="h-4 w-4" />
          New Card
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Total Cards
              </p>
              <p className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                {metrics.total}
              </p>
            </div>
            <CreditCard className="h-8 w-8" style={{ color: colors.primary }} />
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Active Cards
          </p>
          <p className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            {metrics.active}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Blocked Cards
          </p>
          <p className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            {metrics.blocked}
          </p>
        </Card>
      </div>

      {showCreateForm && (
        <Card className="p-6">
          <VirtualCardApply
            onCreated={() => {
              setShowCreateForm(false)
              fetchCards()
            }}
          />
        </Card>
      )}

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold" style={{ color: colors.textPrimary }}>
          Your Cards
        </h3>
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-8">
            <Spinner className="h-5 w-5" />
            <span className="text-sm" style={{ color: colors.textSecondary }}>
              Loading cards...
            </span>
          </div>
        ) : (
          <VirtualCardGrid cards={cards} onRefresh={fetchCards} />
        )}
      </Card>
    </div>
  )
}
