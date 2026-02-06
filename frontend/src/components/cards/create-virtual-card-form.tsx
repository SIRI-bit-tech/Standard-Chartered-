'use client';

import React from "react"

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface CreateVirtualCardFormProps {
  onSuccess?: () => void;
}

const cardTypes = [
  { value: 'single_use', label: 'Single Use - for one-time purchases' },
  { value: 'time_limited', label: 'Time Limited - expires after set period' },
  { value: 'subscription', label: 'Subscription - for recurring charges' },
  { value: 'recurring', label: 'Recurring - for regular payments' }
];

export function CreateVirtualCardForm({ onSuccess }: CreateVirtualCardFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    account_id: '',
    card_type: 'single_use',
    card_name: '',
    spending_limit: '',
    daily_limit: '',
    monthly_limit: '',
    requires_3d_secure: true
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient.post(
        '/api/v1/cards/create',
        {
          ...formData,
          spending_limit: formData.spending_limit ? parseFloat(formData.spending_limit) : null,
          daily_limit: formData.daily_limit ? parseFloat(formData.daily_limit) : null,
          monthly_limit: formData.monthly_limit ? parseFloat(formData.monthly_limit) : null
        },
        { params: { user_id: user?.id } }
      );

      if (response.data.success) {
        toast({
          title: 'Virtual Card Created',
          description: 'Your new virtual card is ready to use'
        });
        setFormData({
          account_id: '',
          card_type: 'single_use',
          card_name: '',
          spending_limit: '',
          daily_limit: '',
          monthly_limit: '',
          requires_3d_secure: true
        });
        onSuccess?.();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to create card',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="bg-blue-50 border-blue-200 p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            Create a virtual card for secure online shopping. Set spending limits and block specific merchants.
          </div>
        </div>
      </Card>

      <div>
        <Label htmlFor="account">From Account</Label>
        <Input
          id="account"
          type="text"
          placeholder="Select your account"
          value={formData.account_id}
          onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
          disabled={loading}
          required
        />
      </div>

      <div>
        <Label htmlFor="cardName">Card Name</Label>
        <Input
          id="cardName"
          type="text"
          placeholder="e.g., Shopping Card, Netflix, etc."
          value={formData.card_name}
          onChange={(e) => setFormData({ ...formData, card_name: e.target.value })}
          disabled={loading}
          required
        />
      </div>

      <div>
        <Label>Card Type</Label>
        <div className="space-y-2 mt-2">
          {cardTypes.map((type) => (
            <label key={type.value} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted">
              <input
                type="radio"
                name="card_type"
                value={type.value}
                checked={formData.card_type === type.value}
                onChange={(e) => setFormData({ ...formData, card_type: e.target.value })}
                disabled={loading}
              />
              <span className="text-sm">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="spending">Spending Limit (Optional)</Label>
          <Input
            id="spending"
            type="number"
            placeholder="e.g., 1000"
            step="0.01"
            min="0"
            value={formData.spending_limit}
            onChange={(e) => setFormData({ ...formData, spending_limit: e.target.value })}
            disabled={loading}
          />
        </div>

        <div>
          <Label htmlFor="daily">Daily Limit (Optional)</Label>
          <Input
            id="daily"
            type="number"
            placeholder="e.g., 500"
            step="0.01"
            min="0"
            value={formData.daily_limit}
            onChange={(e) => setFormData({ ...formData, daily_limit: e.target.value })}
            disabled={loading}
          />
        </div>

        <div>
          <Label htmlFor="monthly">Monthly Limit (Optional)</Label>
          <Input
            id="monthly"
            type="number"
            placeholder="e.g., 5000"
            step="0.01"
            min="0"
            value={formData.monthly_limit}
            onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })}
            disabled={loading}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 p-3 border rounded cursor-pointer">
        <input
          type="checkbox"
          checked={formData.requires_3d_secure}
          onChange={(e) => setFormData({ ...formData, requires_3d_secure: e.target.checked })}
          disabled={loading}
        />
        <span className="text-sm">Require 3D Secure verification for purchases</span>
      </label>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creating...' : 'Create Virtual Card'}
      </Button>
    </form>
  );
}
