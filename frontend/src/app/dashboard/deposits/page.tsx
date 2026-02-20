'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { CheckDepositForm } from '@/components/deposits/check-deposit-form';
import { DepositList } from '@/components/deposits/deposit-list';
import { ArrowDownLeft, Zap } from 'lucide-react';

interface Deposit {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  reference_number: string;
  created_at: string;
  is_verified?: boolean;
}

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Always attempt to fetch; the API client attaches tokens from storage/cookies
    fetchDeposits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDeposits() {
    try {
      setLoading(true);
      const response = await apiClient.get<{ success?: boolean; deposits?: Deposit[]; data?: { deposits?: Deposit[] } }>(`/api/v1/deposits/list`);
      console.log('API Response:', response);
      if ((response && typeof response === 'object') || Array.isArray(response)) {
        let items: any = [];
        if (Array.isArray(response)) {
          items = response;
        } else if (response.deposits) {
          items = response.deposits;
        } else if ((response as any).data?.deposits) {
          items = (response as any).data.deposits;
        }
        console.log('Raw items from response:', items);

        // Normalize status to lowercase for frontend consistency
        items = items.map((d: any) => ({
          ...d,
          status: (d.status || '').toLowerCase()
        }));
        console.log('Normalized deposits:', items);
        setDeposits(items);
      } else {
        console.warn('Unexpected API response format:', response);
      }
    } catch (error) {
      console.error('Failed to fetch deposits:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Deposits</h1>
        <p className="text-muted-foreground">Deposit checks using your phone</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Deposits</p>
              <p className="text-2xl font-bold">{deposits.length}</p>
            </div>
            <ArrowDownLeft className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Deposits</p>
              <p className="text-2xl font-bold text-red-600">
                {deposits.filter(d => (d.status || '').toLowerCase() === 'pending').length}
              </p>
            </div>
            <Zap className="w-8 h-8 text-red-600" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Mobile Check Deposit</h3>
        <CheckDepositForm onSuccess={fetchDeposits} />
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Deposits</h3>
        <DepositList deposits={deposits} loading={loading} onRefresh={fetchDeposits} />
      </Card>
    </div>
  );
}
