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
import { AccountActionsMenu } from '@/components/admin/AccountActionsMenu'
 import { colors } from '@/types'
 
 interface AdminAccountRow {
   id: string
   account_number: string
   type: string
   currency: string
   balance: number
   status: string
   user: { id: string; name: string; display_id: string }
   created_at?: string | null
 }
 
 export function AdminAccountTable({ items }: { items: AdminAccountRow[] }) {
   return (
     <div className="rounded-xl border bg-white" style={{ borderColor: colors.border }}>
       <Table>
         <TableHeader>
           <TableRow>
             <TableHead className="px-4">Account</TableHead>
             <TableHead>User</TableHead>
             <TableHead>Type</TableHead>
             <TableHead>Currency</TableHead>
             <TableHead className="text-right">Balance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right pr-4">Actions</TableHead>
           </TableRow>
         </TableHeader>
         <TableBody>
           {items.map((a) => (
             <TableRow key={a.id}>
               <TableCell className="px-4 text-sm" style={{ color: colors.textSecondary }}>
                 {a.account_number}
               </TableCell>
               <TableCell>
                 <div className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                   {a.user.name}
                 </div>
                 <div className="text-[11px]" style={{ color: colors.textSecondary }}>
                   {a.user.display_id}
                 </div>
               </TableCell>
               <TableCell className="text-sm" style={{ color: colors.textSecondary }}>
                 {a.type}
               </TableCell>
               <TableCell className="text-sm" style={{ color: colors.textSecondary }}>
                 {a.currency}
               </TableCell>
               <TableCell className="text-right text-sm" style={{ color: colors.textPrimary }}>
                 {a.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="border-0"
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
                <AccountActionsMenu account={{ id: a.id, status: a.status }} />
              </TableCell>
             </TableRow>
           ))}
         </TableBody>
       </Table>
     </div>
   )
 }
