'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateVirtualCardForm } from '@/components/cards/create-virtual-card-form';
import { VirtualCardList } from '@/components/cards/virtual-card-list';
import { PlusIcon, CreditCard } from 'lucide-react';

export default function VirtualCardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchCards();
  }, [user?.id]);

  async function fetchCards() {
    try {
      if (!user?.id) return;
      const response = await apiClient.get(`/api/v1/cards/list?user_id=${user.id}`);
      if (response.data.success) {
        setCards(response.data.cards);
      }
    } catch (error) {
      console.error('Failed to fetch virtual cards:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Virtual Cards</h1>
          <p className="text-muted-foreground">Create and manage virtual cards for secure online payments</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          New Card
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Cards</p>
              <p className="text-2xl font-bold">{cards.length}</p>
            </div>
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div>
            <p className="text-sm text-muted-foreground">Active Cards</p>
            <p className="text-2xl font-bold">
              {cards.filter(c => c.status === 'active').length}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div>
            <p className="text-sm text-muted-foreground">Blocked Cards</p>
            <p className="text-2xl font-bold">
              {cards.filter(c => c.status === 'blocked').length}
            </p>
          </div>
        </Card>
      </div>

      {showCreateForm && (
        <Card className="p-6">
          <CreateVirtualCardForm
            onSuccess={() => {
              setShowCreateForm(false);
              fetchCards();
            }}
          />
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Your Cards</h3>
        <VirtualCardList cards={cards} loading={loading} onRefresh={fetchCards} />
      </Card>
    </div>
  );
}
