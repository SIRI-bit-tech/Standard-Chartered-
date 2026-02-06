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

interface CheckDepositFormProps {
  onSuccess?: () => void;
}

export function CheckDepositForm({ onSuccess }: CheckDepositFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [depositId, setDepositId] = useState<string>('');
  const [formData, setFormData] = useState({
    account_id: '',
    amount: '',
    check_number: '',
    check_issuer_bank: '',
    currency: 'USD'
  });
  const [verificationCode, setVerificationCode] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.account_id) {
      toast({
        title: 'Error',
        description: 'Please select an account',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/api/v1/deposits/check-deposit', {
        ...formData,
        amount: parseFloat(formData.amount)
      }, {
        params: { user_id: user?.id }
      });

      if (response.data.success) {
        setDepositId(response.data.deposit_id);
        setStep('verify');
        toast({
          title: 'Check Deposit Initiated',
          description: 'Verification code sent to your phone'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to initiate deposit',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiClient.post(
        '/api/v1/deposits/verify-check-deposit',
        {
          deposit_id: depositId,
          verification_code: verificationCode
        },
        { params: { user_id: user?.id } }
      );

      if (response.data.success) {
        toast({
          title: 'Check Verified',
          description: 'Your check deposit is being processed'
        });
        setStep('form');
        setFormData({
          account_id: '',
          amount: '',
          check_number: '',
          check_issuer_bank: '',
          currency: 'USD'
        });
        setVerificationCode('');
        onSuccess?.();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Verification failed',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  if (step === 'verify') {
    return (
      <form onSubmit={handleVerify} className="space-y-4">
        <Card className="bg-blue-50 border-blue-200 p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              We sent a verification code to your phone. Enter it below to confirm the check deposit.
            </div>
          </div>
        </Card>

        <div>
          <Label htmlFor="code">Verification Code</Label>
          <Input
            id="code"
            type="text"
            placeholder="000000"
            maxLength={6}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
            disabled={loading}
            className="text-2xl tracking-widest text-center font-mono"
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep('form')}
            disabled={loading}
          >
            Back
          </Button>
          <Button type="submit" disabled={loading || verificationCode.length !== 6}>
            {loading ? 'Verifying...' : 'Verify Deposit'}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="account">From Account</Label>
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
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            disabled={loading}
          />
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            type="text"
            value={formData.currency}
            disabled
            className="bg-muted"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="checkNumber">Check Number</Label>
        <Input
          id="checkNumber"
          type="text"
          placeholder="e.g., 1234567"
          value={formData.check_number}
          onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
          disabled={loading}
        />
      </div>

      <div>
        <Label htmlFor="issuer">Check Issuer Bank</Label>
        <Input
          id="issuer"
          type="text"
          placeholder="e.g., Bank of America"
          value={formData.check_issuer_bank}
          onChange={(e) => setFormData({ ...formData, check_issuer_bank: e.target.value })}
          disabled={loading}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Initiating...' : 'Initiate Check Deposit'}
      </Button>
    </form>
  );
}
