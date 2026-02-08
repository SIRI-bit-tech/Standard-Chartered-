'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { formatCurrency, formatDate, getTransactionIcon, getTransactionColor } from '@/lib/utils'
import type { Account, Transaction } from '@/types'

export default function AccountDetailPage() {
  const params = useParams()
  const accountId = params.id as string
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('transactions')

  useEffect(() => {
    loadAccountDetails()
  }, [accountId])

  const loadAccountDetails = async () => {
    try {
      // Fetch account details
      const accountResponse = await apiClient.get<{ success: boolean; data: Account }>(`/api/v1/accounts/${accountId}`)
      if (accountResponse.success) {
        setAccount(accountResponse.data)
      }

      // Fetch transactions
      const transactionsResponse = await apiClient.get<{ success: boolean; data: Transaction[] }>(
        `/api/v1/accounts/${accountId}/transactions?limit=50`
      )
      if (transactionsResponse.success) {
        setTransactions(transactionsResponse.data)
      }
    } catch (error) {
      console.error('Failed to load account details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading account details...</div>
  }

  if (!account) {
    return <div className="text-center py-12">Account not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/accounts" className="text-primary hover:underline">
          ← Back to Accounts
        </Link>
      </div>

      {/* Account Overview */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-primary-100 mb-2">{account.type.toUpperCase()} ACCOUNT</p>
            <h1 className="text-3xl font-bold">{account.nickname || 'Account'}</h1>
          </div>
          <span className="text-4xl">💳</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-primary-100 text-sm mb-1">Balance</p>
            <p className="text-2xl font-bold">{formatCurrency(account.balance, account.currency)}</p>
          </div>
          <div>
            <p className="text-primary-100 text-sm mb-1">Available</p>
            <p className="text-2xl font-bold">
              {formatCurrency(account.available_balance, account.currency)}
            </p>
          </div>
          <div>
            <p className="text-primary-100 text-sm mb-1">Account Number</p>
            <p className="text-lg font-mono">****{account.account_number.slice(-4)}</p>
          </div>
          <div>
            <p className="text-primary-100 text-sm mb-1">Status</p>
            <p className="text-lg capitalize">{account.status}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-border">
        <div className="flex gap-8 px-6 py-4">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 font-medium transition ${
              activeTab === 'transactions'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 font-medium transition ${
              activeTab === 'details'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Details
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl p-6 border border-border">
        {activeTab === 'transactions' && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-6">Recent Transactions</h2>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((transaction: Transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-border-light transition">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-2xl">{getTransactionIcon(transaction.type)}</div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'debit' || transaction.type === 'withdrawal'
                          ? '-'
                          : '+'}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{transaction.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found for this account
              </div>
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-4">Account Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Type:</span>
                  <span className="font-medium text-foreground capitalize">{account.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Number:</span>
                  <span className="font-mono font-medium text-foreground">
                    {account.account_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency:</span>
                  <span className="font-medium text-foreground">{account.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium text-foreground capitalize">{account.status}</span>
                </div>
              </div>
            </div>

            <hr className="border-border" />

            <div>
              <h3 className="font-semibold text-foreground mb-4">Account Features</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={account.is_primary} readOnly />
                  <span className="text-muted-foreground">Primary Account</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={account.overdraft_enabled} readOnly />
                  <span className="text-muted-foreground">Overdraft Protection</span>
                </label>
              </div>
            </div>

            <hr className="border-border" />

            <div className="space-y-3">
              <button className="w-full py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition">
                Edit Account
              </button>
              <button className="w-full py-2 border border-error text-error rounded-lg hover:bg-error/5 transition">
                Close Account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/dashboard/transfers"
          className="flex items-center justify-center gap-2 p-4 bg-white border border-border rounded-lg hover:border-primary transition"
        >
          <span className="text-2xl">↔️</span>
          <span className="font-medium">Transfer</span>
        </Link>
        <Link
          href="/dashboard/bills"
          className="flex items-center justify-center gap-2 p-4 bg-white border border-border rounded-lg hover:border-primary transition"
        >
          <span className="text-2xl">📄</span>
          <span className="font-medium">Pay Bills</span>
        </Link>
        <button className="flex items-center justify-center gap-2 p-4 bg-white border border-border rounded-lg hover:border-primary transition">
          <span className="text-2xl">📥</span>
          <span className="font-medium">Deposit</span>
        </button>
        <button className="flex items-center justify-center gap-2 p-4 bg-white border border-border rounded-lg hover:border-primary transition">
          <span className="text-2xl">📤</span>
          <span className="font-medium">Withdraw</span>
        </button>
      </div>
    </div>
  )
}
