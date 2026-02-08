'use client'

import React from "react"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useAccountStore } from '@/lib/store'
import { formatCurrency, toTitleCase } from '@/lib/utils'
import { ACCOUNT_TYPES } from '@/constants'
import { Skeleton } from '@/components/ui/skeleton'
import type { Account } from '@/types'

export default function AccountsPage() {
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newAccount, setNewAccount] = useState({
    type: 'checking',
    nickname: '',
  })
  const { user } = useAuthStore()
  const { accounts, setAccounts } = useAccountStore()

  useEffect(() => {
    loadAccounts()
  }, [user])

  const loadAccounts = async () => {
    if (!user) return
    try {
      const response = await apiClient.get<{ success: boolean; data: Account[] }>(`/api/v1/accounts?user_id=${user.id}`)
      if (response.success && response.data) {
        setAccounts(response.data)
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const response = await apiClient.post<{ success: boolean; data: any }>('/api/v1/accounts', {
        user_id: user.id,
        account_type: newAccount.type,
        currency: user.primary_currency,
        nickname: newAccount.nickname,
      })

      if (response.success && response.data) {
        await loadAccounts()
        setShowCreateModal(false)
        setNewAccount({ type: 'checking', nickname: '' })
      }
    } catch (error) {
      console.error('Failed to create account:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">My Accounts</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
        >
          + New Account
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-border rounded-xl p-6 hover:shadow-lg transition">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32 mb-2" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
              <div className="mb-6">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="flex justify-end">
                <Skeleton className="h-10 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accounts.map((account: Account) => (
            <Link
              key={account.id}
              href={`/dashboard/accounts/${account.id}`}
              className="bg-white border border-border rounded-xl p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">
                    {toTitleCase(account.type)} Account
                  </p>
                  <h3 className="text-xl font-semibold text-foreground">
                    {account.nickname || 'Unnamed Account'}
                  </h3>
                </div>
                <span className="text-3xl">
                  {account.type === 'checking' ? '💳' : account.type === 'savings' ? '🏦' : '₿'}
                </span>
              </div>

              <div className="mb-6">
                <p className="text-muted-foreground text-sm mb-1">Account Balance</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(account.balance, account.currency)}
                </p>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground mb-6">
                <div className="flex justify-between">
                  <span>Account Number:</span>
                  <span className="font-mono">****{account.account_number.slice(-4)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="capitalize">{account.status}</span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.preventDefault()
                }}
                className="w-full py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition text-sm"
              >
                View Details
              </button>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 text-center border border-border">
          <p className="text-muted-foreground mb-4">No accounts yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
          >
            Create Your First Account
          </button>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-foreground mb-6">Create New Account</h2>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Account Type
                </label>
                <select
                  value={newAccount.type}
                  onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Account Nickname (Optional)
                </label>
                <input
                  type="text"
                  value={newAccount.nickname}
                  onChange={(e) => setNewAccount({ ...newAccount, nickname: e.target.value })}
                  placeholder="e.g., My Savings"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 border border-border rounded-lg hover:bg-border transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
