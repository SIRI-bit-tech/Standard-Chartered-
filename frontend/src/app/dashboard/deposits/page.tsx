'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckDepositForm } from '@/components/deposits/check-deposit-form';
import { DirectDepositForm } from '@/components/deposits/direct-deposit-form';
import { DepositList } from '@/components/deposits/deposit-list';
import { ArrowDownLeft, Zap } from 'lucide-react';

export default function DepositsPage() {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('check');

  useEffect(() => {
    fetchDeposits();
  }, [user?.id]);

  async function fetchDeposits() {
    try {
      if (!user?.id) return;
      const response = await apiClient.get(`/api/v1/deposits/list?user_id=${user.id}`);
      if (response.data.success) {
        setDeposits(response.data.deposits);
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
        <p className="text-muted-foreground">Check deposits and direct deposit setup</p>
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
              <p className="text-2xl font-bold">
                {deposits.filter(d => d.status === 'pending').length}
              </p>
            </div>
            <Zap className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="check">Mobile Check Deposit</TabsTrigger>
            <TabsTrigger value="direct">Direct Deposit Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="check" className="space-y-4">
            <div className="pt-4">
              <CheckDepositForm onSuccess={fetchDeposits} />
            </div>
          </TabsContent>

          <TabsContent value="direct" className="space-y-4">
            <div className="pt-4">
              <DirectDepositForm onSuccess={fetchDeposits} />
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Deposits</h3>
        <DepositList deposits={deposits} loading={loading} onRefresh={fetchDeposits} />
      </Card>
    </div>
  );
}
