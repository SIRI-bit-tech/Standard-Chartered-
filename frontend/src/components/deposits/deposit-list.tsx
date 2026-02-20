'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';

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

interface DepositListProps {
  deposits: Deposit[];
  loading?: boolean;
  onRefresh?: () => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-red-100 text-red-800',
  PENDING: 'bg-red-100 text-red-800',
  processing: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  FAILED: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
};

export function DepositList({ deposits, loading, onRefresh }: DepositListProps) {
  const { toast } = useToast();

  async function handleCancel(depositId: string) {
    try {
      const response = await apiClient.delete<any>(`/api/v1/deposits/${depositId}`);

      // Handle both {success: true} and possibly just {message: ...} if success is implied or missing
      if (response && (response.success || response.message)) {
        toast({
          title: 'Deposit Cancelled',
          description: 'The deposit has been cancelled successfully'
        });
        onRefresh?.();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to cancel deposit',
        variant: 'destructive'
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (deposits.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No deposits yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deposits.map((deposit) => (
        <Card key={deposit.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-semibold capitalize">{deposit.type.toLowerCase().replace(/_/g, ' ')}</p>
                  <p className="text-sm text-muted-foreground">{deposit.reference_number}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(deposit.amount, deposit.currency)}</p>
                <p className="text-xs text-muted-foreground">{formatDate(deposit.created_at)}</p>
              </div>

              <Badge className={statusColors[deposit.status as keyof typeof statusColors]}>
                {deposit.status}
              </Badge>

              {(deposit.status || '').toLowerCase() === 'pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancel(deposit.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
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
