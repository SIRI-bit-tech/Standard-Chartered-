'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Lock, Trash2, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface VirtualCard {
  id: string;
  card_name: string;
  card_number: string;
  expiry_month: number;
  expiry_year: number;
  status: string;
  card_type: string;
  spending_limit?: number;
  spent_this_month: number;
  total_transactions: number;
  created_at: string;
}

interface VirtualCardListProps {
  cards: VirtualCard[];
  loading?: boolean;
  onRefresh?: () => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  blocked: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

export function VirtualCardList({ cards, loading, onRefresh }: VirtualCardListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());

  const toggleCardVisibility = (cardId: string) => {
    const newSet = new Set(visibleCards);
    if (newSet.has(cardId)) {
      newSet.delete(cardId);
    } else {
      newSet.add(cardId);
    }
    setVisibleCards(newSet);
  };

  async function handleBlock(cardId: string) {
    try {
      const response = await apiClient.post(
        `/api/v1/cards/${cardId}/block`,
        { reason: 'User initiated block' },
        { params: { user_id: user?.id } }
      );

      if (response.data.success) {
        toast({ title: 'Card Blocked', description: 'The card has been blocked' });
        onRefresh?.();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to block card',
        variant: 'destructive'
      });
    }
  }

  async function handleDelete(cardId: string) {
    if (!confirm('Are you sure you want to cancel this card?')) return;

    try {
      const response = await apiClient.delete(`/api/v1/cards/${cardId}`, {
        params: { user_id: user?.id }
      });

      if (response.data.success) {
        toast({ title: 'Card Cancelled', description: 'The card has been cancelled' });
        onRefresh?.();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to cancel card',
        variant: 'destructive'
      });
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Card number copied to clipboard' });
  }

  function maskCardNumber(number: string): string {
    return `**** **** **** ${number.slice(-4)}`;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/20">
        <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
        <p className="text-muted-foreground">No virtual cards yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cards.map((card) => (
        <Card key={card.id} className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-300">{card.card_name}</p>
                <p className="text-lg font-semibold mt-1">Visa Virtual</p>
              </div>
              <Badge
                className={`${statusColors[card.status as keyof typeof statusColors]} text-white`}
              >
                {card.status}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="font-mono text-lg tracking-wider">
                {visibleCards.has(card.id) ? card.card_number : maskCardNumber(card.card_number)}
              </div>
              <button
                onClick={() => toggleCardVisibility(card.id)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                {visibleCards.has(card.id) ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>
                {card.expiry_month.toString().padStart(2, '0')}/{card.expiry_year}
              </span>
              <span>{card.total_transactions} transactions</span>
            </div>

            {card.spending_limit && (
              <div className="pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Monthly Limit</span>
                  <span>
                    {formatCurrency(card.spent_this_month)} / {formatCurrency(card.spending_limit)}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min((card.spent_this_month / card.spending_limit!) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-slate-600 text-white hover:bg-slate-700 bg-transparent"
                onClick={() => copyToClipboard(card.card_number)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Number
              </Button>

              {card.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-slate-600 text-white hover:bg-slate-700 bg-transparent"
                  onClick={() => handleBlock(card.id)}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Block
                </Button>
              )}

              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => handleDelete(card.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {onRefresh && (
        <Button variant="outline" size="sm" onClick={onRefresh} className="w-full gap-2 bg-transparent">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      )}
    </div>
  );
}
