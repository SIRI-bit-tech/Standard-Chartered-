'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useAuthStore, useAccountStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { Account, Transaction } from '@/types'

type AccountsResponse = {
  success: boolean
  message: string
  data: Account[]
}

type TransactionsResponse = {
  success: boolean
  data: Transaction[]
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [totalBalance, setTotalBalance] = useState(0)
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const { user } = useAuthStore()
  const { accounts, setAccounts } = useAccountStore()
  const router = useRouter()

  // Redirect if not authenticated
  if (!user) {
    useEffect(() => {
      router.push('/auth/login')
    }, [])
    return null
  }

  useEffect(() => {
    // Only load data if user is authenticated
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      if (!user) return

      // Fetch accounts
      const accountsResponse: AccountsResponse = await apiClient.get<AccountsResponse>(
        `/api/v1/accounts?user_id=${user.id}`
      )
      if (accountsResponse.success) {
        setAccounts(accountsResponse.data)
        const total = accountsResponse.data.reduce(
          (sum: number, acc: Account) => sum + acc.balance,
          0
        )
        setTotalBalance(total)
      }

      // Fetch recent transactions
      if (accountsResponse.data.length > 0) {
        const firstAccountId = accountsResponse.data[0].id
        const transactionsResponse: TransactionsResponse =
          await apiClient.get<TransactionsResponse>(
            `/api/v1/accounts/${firstAccountId}/transactions?limit=5`
          )
        if (transactionsResponse.success) {
          setRecentTransactions(transactionsResponse.data)
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white rounded-2xl p-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.first_name}!</h1>
        <p className="text-primary-100">Here's your financial overview</p>
      </div>

      {/* Total Balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-border shadow-sm">
          <p className="text-muted-foreground text-sm font-medium mb-2">Total Balance</p>
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(totalBalance, user?.primary_currency)}
            </p>
          )}
          <p className="text-muted-foreground text-sm mt-2">Across all accounts</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-border shadow-sm">
          <p className="text-muted-foreground text-sm font-medium mb-2">Active Accounts</p>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold text-foreground">{accounts.length}</p>
          )}
          <p className="text-muted-foreground text-sm mt-2">Ready to use</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-border shadow-sm">
          <p className="text-muted-foreground text-sm font-medium mb-2">Account Tier</p>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-3xl font-bold text-yellow-600 capitalize">Premium</p>
          )}
          <p className="text-muted-foreground text-sm mt-2">All premium benefits included</p>
        </div>
      </div>

      {/* Accounts Section */}
      <div className="bg-white rounded-xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Your Accounts</h2>
          <Link href="/dashboard/accounts" className="text-primary hover:underline text-sm">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border border-border rounded-lg">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account: Account) => (
              <Link
                key={account.id}
                href={`/dashboard/accounts/${account.id}`}
                className="p-4 border border-border rounded-lg hover:border-primary hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">
                    {account.type === 'checking' ? '💳' : account.type === 'savings' ? '🏦' : '₿'}
                  </span>
                  <span className="text-xs font-medium bg-secondary/10 text-secondary px-2 py-1 rounded">
                    {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm mb-2">{account.nickname || 'Unnamed Account'}</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(account.balance, account.currency)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No accounts yet</p>
            <Link href="/dashboard/accounts" className="text-primary hover:underline">
              Create an account
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 border border-border shadow-sm">
        <h2 className="text-2xl font-bold text-foreground mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center justify-center p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition"
            >
              <span className="text-3xl mb-2">{action.icon}</span>
              <span className="text-sm font-medium text-center">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Recent Transactions</h2>
          <Link href="/dashboard/accounts" className="text-primary hover:underline text-sm">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border border-border rounded-lg">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((transaction: Transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-2xl">
                    {transaction.type === 'debit' ? '⬇️' : '⬆️'}
                  </div>
                    <div className="flex-1">
                    <p className="font-medium text-foreground">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(transaction.created_at)}</p>
                  </div>
                </div>
                <div className={`font-bold ${transaction.type === 'debit' ? 'text-error' : 'text-success'}`}>
                  {transaction.type === 'debit' ? '-' : '+'}{formatCurrency(transaction.amount)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No transactions yet</div>
        )}
      </div>
    </div>
  )
}

const quickActions = [
  { icon: '↔️', label: 'Transfer Money', href: '/dashboard/transfers' },
  { icon: '📄', label: 'Pay Bills', href: '/dashboard/bills' },
  { icon: '🏦', label: 'Apply for Loan', href: '/dashboard/loans' },
  { icon: '👤', label: 'Profile', href: '/dashboard/profile' },
]
