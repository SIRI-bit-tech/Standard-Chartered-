'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, ShieldCheck, AlertTriangle } from 'lucide-react'
import { colors } from '@/types'
import type { AdminUserRow } from '@/types'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { useState } from 'react'
import { AdminEditUserDialog } from '@/components/admin/admin-edit-user-dialog'
import { ConfirmModal } from '@/components/ui/confirm-modal'

function statusBadge(status: AdminUserRow['status']) {
  if (status === 'active') return { bg: `${colors.success}20`, fg: colors.success, label: 'Active' }
  if (status === 'suspended') return { bg: `${colors.error}20`, fg: colors.error, label: 'Suspended' }
  return { bg: `${colors.gray300}55`, fg: colors.textSecondary, label: 'Inactive' }
}

export function AdminUserTable({ items }: { items: AdminUserRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean
    title: string
    description: string
    action: () => void
    confirmText?: string
    variant?: 'default' | 'destructive'
  }>({
    isOpen: false,
    title: '',
    description: '',
    action: () => { },
  })
  return (
    <div className="rounded-xl border bg-white" style={{ borderColor: colors.border }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">User ID</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Verification</TableHead>
            <TableHead className="text-right pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((u) => {
            const st = statusBadge(u.status)
            return (
              <TableRow key={u.id}>
                <TableCell className="px-4 text-xs" style={{ color: colors.textSecondary }}>
                  {u.user_id}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {u.profile_picture_url ? <AvatarImage src={u.profile_picture_url} alt={u.name} /> : null}
                      <AvatarFallback style={{ backgroundColor: colors.primaryLight, color: colors.primary }}>
                        {getInitials(u.name, '')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                        {u.name}
                      </div>
                      <div className="text-[11px] uppercase" style={{ color: colors.textSecondary }}>
                        {u.country}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm" style={{ color: colors.textSecondary }}>
                  {u.email}
                </TableCell>
                <TableCell>
                  <Badge className="border-0" style={{ backgroundColor: st.bg, color: st.fg }}>
                    {st.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.verification === 'verified' ? (
                    <ShieldCheck className="h-4 w-4" style={{ color: colors.primary }} />
                  ) : u.verification === 'needs_review' ? (
                    <AlertTriangle className="h-4 w-4" style={{ color: colors.warning }} />
                  ) : (
                    <span className="text-xs" style={{ color: colors.textSecondary }}>
                      —
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right pr-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingId(u.id)
                          setDialogOpen(true)
                        }}
                      >
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: u.status === 'active' ? 'Suspend User?' : 'Activate User?',
                            description: `Are you sure you want to ${u.status === 'active' ? 'suspend' : 'activate'} this user?`,
                            confirmText: u.status === 'active' ? 'Yes, Suspend' : 'Yes, Activate',
                            variant: u.status === 'active' ? 'destructive' : 'default',
                            action: async () => {
                              try {
                                const adminId = localStorage.getItem('admin_id')
                                if (!adminId) {
                                  window.location.href = '/admin/auth/login'
                                  return
                                }
                                const qs = new URLSearchParams({ admin_id: adminId })
                                await apiClient.put(`/admin/users/edit?${qs.toString()}`, {
                                  user_id: u.id,
                                  is_active: u.status !== 'active',
                                })
                                window.location.reload()
                              } catch (err: any) {
                                logger.error('Failed to toggle user active state', { error: err })
                              }
                            }
                          })
                        }}
                      >
                        {u.status === 'active' ? 'Suspend User' : 'Activate User'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: 'Delete User?',
                            description: 'Are you sure you want to delete this user? This action cannot be undone.',
                            confirmText: 'Yes, Delete',
                            variant: 'destructive',
                            action: async () => {
                              try {
                                const adminId = localStorage.getItem('admin_id')
                                if (!adminId) {
                                  window.location.href = '/admin/auth/login'
                                  return
                                }
                                const qs = new URLSearchParams({ admin_id: adminId, user_id: u.id })
                                await apiClient.delete(`/admin/users/delete?${qs.toString()}`)
                                window.location.reload()
                              } catch (err: any) {
                                logger.error('Failed to delete user', { error: err })
                              }
                            }
                          })
                        }}
                      >
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <AdminEditUserDialog
        open={dialogOpen}
        onOpenChange={(v) => setDialogOpen(v)}
        userId={editingId}
        onSaved={() => {
          window.location.reload()
        }}
      />
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={() => {
          confirmConfig.action()
          setConfirmConfig({ ...confirmConfig, isOpen: false })
        }}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
      />
    </div>
  )
}
