'use client';

import React from "react"

import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Scan } from 'lucide-react';
import { FromAccountSelect } from '@/components/transfers/from-account-select';
import { ImageUpload } from '@/components/ImageUpload';
import { getCurrencyFromCountry } from '@/lib/utils';
import type { Account } from '@/types';

interface CheckDepositFormProps {
  onSuccess?: () => void;
}

export function CheckDepositForm({ onSuccess }: CheckDepositFormProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [formData, setFormData] = useState({
    account_id: '',
    amount: '',
    check_number: '',
    check_issuer_bank: '',
    name_on_check: '',
    front_image_url: '',
    currency: user?.primary_currency || getCurrencyFromCountry(user?.country)
  });

  const [touched, setTouched] = useState({ amount: false, check_number: false });

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiClient.get<any>('/api/v1/accounts/');
        const items: Account[] = Array.isArray(res) ? res : res.data || res.accounts || [];
        if (mounted) setAccounts(items || []);
      } catch {
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function runOcr(url: string) {
    try {
      setOcrRunning(true);
      const result = await apiClient.post<{ success: boolean; amount?: number; check_number?: string; raw_text?: string }>(
        '/api/v1/deposits/parse-check',
        { front_image_url: url }
      );
      const amtStr = result?.amount != null ? String(result.amount) : '';
      const chk = result?.check_number || '';
      setFormData(prev => ({
        ...prev,
        front_image_url: url,
        // Always prefer fresh OCR results when a new image is chosen,
        // unless the user has manually edited the fields in this session.
        amount: touched.amount ? prev.amount : amtStr,
        check_number: touched.check_number ? prev.check_number : chk,
      }));
      toast({
        title: 'Auto-detect complete',
        description: `${chk ? 'Check #' + chk : 'No check # found'}${chk && amtStr ? ' • ' : ''}${amtStr ? 'Amount $' + amtStr : 'No amount found'}`,
      });
    } catch {
      toast({
        title: 'Could not read check',
        description: 'Enter details manually',
      });
    } finally {
      setOcrRunning(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.account_id) {
      toast({
        title: 'Error',
        description: 'Select an account',
        variant: 'destructive'
      });
      return;
    }
    if (!formData.front_image_url) {
      toast({
        title: 'Error',
        description: 'Upload the front of the check',
        variant: 'destructive'
      });
      return;
    }
    if (!formData.name_on_check) {
      toast({
        title: 'Error',
        description: 'Enter the name on the check',
        variant: 'destructive'
      });
      return;
    }
    const amtStr = (formData.amount || '').toString().trim();
    if (!amtStr) {
      toast({
        title: 'Error',
        description: 'Enter the amount',
        variant: 'destructive'
      });
      return;
    }
    const validAmount = Number(amtStr);
    if (!Number.isFinite(validAmount) || validAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Enter a valid amount greater than 0',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post<{
        success: boolean;
        deposit_id: string;
        status: string;
        message: string;
      }>('/api/v1/deposits/check-deposit', {
        ...formData,
        amount: validAmount
      }, {
        params: { user_id: user?.id }
      });

      if (response.success) {
        toast({
          title: 'Check submitted',
          description: 'Your deposit is pending review'
        });
        setFormData({
          account_id: '',
          amount: '',
          check_number: '',
          check_issuer_bank: '',
          name_on_check: '',
          front_image_url: '',
          currency: user?.primary_currency || getCurrencyFromCountry(user?.country)
        });
        onSuccess?.();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to submit deposit',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }



  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FromAccountSelect
        accounts={accounts}
        value={formData.account_id}
        onChange={(v) => setFormData({ ...formData, account_id: v })}
        label="Deposit To"
        showBalance
        disabled={loading}
      />

      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label>Front of Check</Label>
          <ImageUpload
            value={formData.front_image_url}
            onChange={(v) => {
              const isDifferent = v && v !== formData.front_image_url;
              setFormData(prev => ({
                ...prev,
                front_image_url: v,
                // Clear fields so old values don't linger when a new image is selected
                amount: isDifferent ? '' : prev.amount,
                check_number: isDifferent ? '' : prev.check_number,
              }));
              if (isDifferent) {
                setTouched({ amount: false, check_number: false });
              }
              if (v) runOcr(v);
            }}
            label="Upload front image"
          />
          {formData.front_image_url && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <Scan className="w-4 h-4" />
              <span>{ocrRunning ? 'Reading check...' : 'Auto-detect will try to fill details'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => {
              setTouched(prev => ({ ...prev, amount: true }));
              setFormData({ ...formData, amount: e.target.value });
            }}
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
        <Label htmlFor="nameOnCheck">Name on Check</Label>
        <Input
          id="nameOnCheck"
          type="text"
          placeholder="Name written on the check"
          value={formData.name_on_check}
          onChange={(e) => setFormData({ ...formData, name_on_check: e.target.value })}
          disabled={loading}
        />
      </div>

      <div>
        <Label htmlFor="checkNumber">Check Number</Label>
        <Input
          id="checkNumber"
          type="text"
          placeholder="e.g., 1234567"
          value={formData.check_number}
          onChange={(e) => {
            setTouched(prev => ({ ...prev, check_number: true }));
            setFormData({ ...formData, check_number: e.target.value });
          }}
          disabled={loading}
        />
      </div>

      <div>
        <Label htmlFor="issuer">Check Issuer Bank (optional)</Label>
        <Input
          id="issuer"
          type="text"
          placeholder="Bank name"
          value={formData.check_issuer_bank}
          onChange={(e) => setFormData({ ...formData, check_issuer_bank: e.target.value })}
          disabled={loading}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Submitting...' : 'Submit Check Deposit'}
      </Button>
    </form>
  );
}
