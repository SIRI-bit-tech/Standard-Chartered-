'use client'

import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AccountActionsMenu } from '@/components/admin/AccountActionsMenu'
import { colors } from '@/types'
import { ChevronDown, ChevronRight, User as UserIcon } from 'lucide-react'

interface AdminAccountRow {
  id: string
  account_number: string
  type: string
  currency: string
  balance: number
  status: string
  wallet_id?: string | null
  wallet_qrcode?: string | null
  user: { id: string; name: string; display_id: string }
  created_at?: string | null
}

export function AdminAccountTable({ items }: { items: AdminAccountRow[] }) {
  const [expandedUsers, setExpandedUsers] = useState<string[]>([])

  const toggleUser = (userId: string) => {
    setExpandedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  // Group items by user
  const grouped = items.reduce((acc, a) => {
    const userId = a.user.id
    if (!acc[userId]) {
      acc[userId] = {
        user: a.user,
        accounts: [],
      }
    }
    acc[userId].accounts.push(a)
    return acc
  }, {} as Record<string, { user: AdminAccountRow['user']; accounts: AdminAccountRow[] }>)

  const userEntries = Object.values(grouped)

  if (userEntries.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-12 text-center" style={{ borderColor: colors.border }}>
        <p className="text-muted-foreground">No accounts found.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: colors.border }}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12"></TableHead>
            <TableHead className="px-4">User Details</TableHead>
            <TableHead className="text-center">Accounts</TableHead>
            <TableHead className="text-right pr-6">Total Balance (approx.)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {userEntries.map(({ user, accounts }) => {
            const isExpanded = expandedUsers.includes(user.id)
            const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance), 0)

            return (
              <React.Fragment key={user.id}>
                {/* User Header Row */}
                <TableRow
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleUser(user.id)}
                >
                  <TableCell className="text-center">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/5 rounded-full text-primary">
                        <UserIcon size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          {user.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {user.display_id}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-semibold">
                      {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6 font-semibold text-foreground">
                    ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>

                {/* Expanded Account Details */}
                {isExpanded && (
                  <TableRow className="bg-muted/10 !border-b-0">
                    <TableCell colSpan={4} className="p-0 border-t-0">
                      <div className="px-12 py-4 bg-muted/5">
                        <Table className="border rounded-lg overflow-hidden border-border bg-white">
                          <TableHeader className="bg-muted/30">
                            <TableRow>
                              <TableHead className="text-xs uppercase font-bold px-4 py-2">Account / Wallet ID</TableHead>
                              <TableHead className="text-xs uppercase font-bold py-2">Type</TableHead>
                              <TableHead className="text-xs uppercase font-bold py-2">Currency</TableHead>
                              <TableHead className="text-xs uppercase font-bold text-right py-2">Balance</TableHead>
                              <TableHead className="text-xs uppercase font-bold py-2">Status</TableHead>
                              <TableHead className="text-xs uppercase font-bold text-right pr-4 py-2">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accounts.map((a) => {
                              const isCrypto = a.type === 'crypto'
                              const displayId = isCrypto
                                ? a.wallet_id || 'No wallet ID'
                                : a.account_number

                              return (
                                <TableRow key={a.id} className="hover:bg-muted/20">
                                  <TableCell className="px-4 py-3 text-sm">
                                    <span className={isCrypto && !a.wallet_id ? "text-orange-500 font-medium" : "text-muted-foreground"}>
                                      {displayId}
                                    </span>
                                    {isCrypto && (
                                      <div className="text-[10px] text-muted-foreground">Wallet ID</div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm capitalize">{a.type}</TableCell>
                                  <TableCell className="text-sm font-medium">{a.currency}</TableCell>
                                  <TableCell className="text-right text-sm font-bold">
                                    {isCrypto
                                      ? `${a.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} BTC`
                                      : a.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className="border-0 capitalize"
                                      style={{
                                        backgroundColor:
                                          a.status === 'active' ? `${colors.success}20` : a.status === 'frozen' ? `${colors.warning}20` : `${colors.gray300}55`,
                                        color:
                                          a.status === 'active' ? colors.success : a.status === 'frozen' ? colors.warning : colors.textSecondary,
                                      }}
                                    >
                                      {a.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right pr-4">
                                    <AccountActionsMenu account={{
                                      id: a.id,
                                      status: a.status,
                                      type: a.type,
                                      wallet_id: a.wallet_id,
                                      wallet_qrcode: a.wallet_qrcode
                                    }} />
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
