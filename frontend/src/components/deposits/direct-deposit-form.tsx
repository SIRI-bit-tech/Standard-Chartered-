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
import { CheckCircle } from 'lucide-react';

interface DirectDepositFormProps {
  onSuccess?: () => void;
}

export function DirectDepositForm({ onSuccess }: DirectDepositFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    account_id: '',
    routing_number: '',
    account_number: '',
    employer_name: '',
    employer_id: ''
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient.post<{ success: boolean }>(
        '/api/v1/deposits/direct-deposit/setup',
        formData,
        { params: { user_id: user?.id } }
      );

      if (response.success) {
        toast({
          title: 'Direct Deposit Setup Complete',
          description: 'You can now receive employer payments'
        });
        setFormData({
          account_id: '',
          routing_number: '',
          account_number: '',
          employer_name: '',
          employer_id: ''
        });
        onSuccess?.();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to setup direct deposit',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card className="bg-green-50 border-green-200 p-4">
        <div className="flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            Direct deposit allows your employer to deposit paychecks directly into your account.
          </div>
        </div>
      </Card>

      <div>
        <Label htmlFor="account">To Account</Label>
        <Input
          id="account"
          type="text"
          placeholder="Select your account"
          value={formData.account_id}
          onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="routing">Routing Number</Label>
          <Input
            id="routing"
            type="text"
            placeholder="9 digits"
            maxLength={9}
            value={formData.routing_number}
            onChange={(e) => setFormData({ ...formData, routing_number: e.target.value.replace(/\D/g, '') })}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-1">Found on checks or online banking</p>
        </div>
        <div>
          <Label htmlFor="account_number">Account Number</Label>
          <Input
            id="account_number"
            type="text"
            placeholder="Your account number"
            value={formData.account_number}
            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="employer">Employer Name</Label>
        <Input
          id="employer"
          type="text"
          placeholder="Your employer's name"
          value={formData.employer_name}
          onChange={(e) => setFormData({ ...formData, employer_name: e.target.value })}
          disabled={loading}
        />
      </div>

      <div>
        <Label htmlFor="employer_id">Employer ID (Optional)</Label>
        <Input
          id="employer_id"
          type="text"
          placeholder="EIN or company ID"
          value={formData.employer_id}
          onChange={(e) => setFormData({ ...formData, employer_id: e.target.value })}
          disabled={loading}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Setting up...' : 'Setup Direct Deposit'}
      </Button>
    </form>
  );
}
