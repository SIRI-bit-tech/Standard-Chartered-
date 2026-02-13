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
 
 function statusBadge(status: AdminUserRow['status']) {
   if (status === 'active') return { bg: `${colors.success}20`, fg: colors.success, label: 'Active' }
   if (status === 'suspended') return { bg: `${colors.error}20`, fg: colors.error, label: 'Suspended' }
   return { bg: `${colors.gray300}55`, fg: colors.textSecondary, label: 'Inactive' }
 }
 
 export function AdminUserTable({ items }: { items: AdminUserRow[] }) {
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
                     <div
                       className="h-9 w-9 rounded-full"
                       style={{ backgroundColor: colors.primaryLight }}
                     />
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
                        onClick={async () => {
                          const confirmed = window.confirm(
                            `Are you sure you want to ${u.status === 'active' ? 'suspend' : 'activate'} this user?`
                          )
                          if (!confirmed) return
                          
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
                        }}
                      >
                        {u.status === 'active' ? 'Suspend User' : 'Activate User'}
                      </DropdownMenuItem>
                     <DropdownMenuItem
                        onClick={async () => {
                          const confirmed = window.confirm(
                            'Are you sure you want to delete this user? This action cannot be undone.'
                          )
                          if (!confirmed) return
                          
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
     </div>
   )
 }
