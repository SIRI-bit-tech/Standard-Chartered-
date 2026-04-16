'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Lock, Trash2, Copy, CreditCard, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface VirtualCard {
  id: string;
  card_name: string;
  card_number: string;
  cvv: string;
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<VirtualCard | null>(null);

  async function handleBlock(cardId: string) {
    try {
      const response = await apiClient.post<{ success: boolean }>(
        `/api/v1/cards/${cardId}/block`,
        { reason: 'User initiated block' },
        { params: { user_id: user?.id } }
      );

      if (response.success) {
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
    setShowDeleteConfirm(cardId);
  }

  async function executeDelete(cardId: string) {

    try {
      const response = await apiClient.delete<{ success: boolean }>(`/api/v1/cards/${cardId}`, {
        params: { user_id: user?.id }
      });

      if (response.success) {
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

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  }

  function maskCardNumber(number: string): string {
    // Show **** **** **** and last 4 digits (12 asterisks + last 4)
    if (!number || number.length < 4) return '**** **** **** ****';
    return `**** **** **** ${number.slice(-4)}`;
  }

  function formatCardNumber(number: string): string {
    // Format as XXXX XXXX XXXX XXXX
    return number.match(/.{1,4}/g)?.join(' ') || number;
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
    <>
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

              <div className="font-mono text-lg tracking-wider">
                {maskCardNumber(card.card_number)}
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
                  onClick={() => setShowDetailsModal(card)}
                >
                  <Info className="w-4 h-4 mr-2" />
                  Details
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
      </div>

      {/* Card Details Modal */}
      <Dialog open={!!showDetailsModal} onOpenChange={(open) => !open && setShowDetailsModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Card Details
            </DialogTitle>
          </DialogHeader>
          
          {showDetailsModal && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Card Number</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(showDetailsModal.card_number, 'Card number')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="font-mono text-lg">{formatCardNumber(showDetailsModal.card_number)}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">CVV</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(showDetailsModal.cvv, 'CVV')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="font-mono text-lg">{showDetailsModal.cvv}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Expiry Date</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(
                      `${showDetailsModal.expiry_month.toString().padStart(2, '0')}/${showDetailsModal.expiry_year}`,
                      'Expiry date'
                    )}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="font-mono text-lg">
                  {showDetailsModal.expiry_month.toString().padStart(2, '0')}/{showDetailsModal.expiry_year}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Cardholder Name</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(
                      `${user?.first_name || ''} ${user?.last_name || ''}`.trim().toUpperCase(),
                      'Cardholder name'
                    )}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="font-mono text-lg uppercase">
                  {user?.first_name || ''} {user?.last_name || ''}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => {
          if (showDeleteConfirm) {
            executeDelete(showDeleteConfirm);
            setShowDeleteConfirm(null);
          }
        }}
        title="Cancel Card?"
        description="Are you sure you want to cancel this virtual card? This action cannot be undone."
        confirmText="Yes, Cancel Card"
        variant="destructive"
      />
    </>
  );
}
