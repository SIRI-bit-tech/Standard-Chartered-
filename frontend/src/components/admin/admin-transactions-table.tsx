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
 import { colors } from '@/types'
 
 import type { AdminTransactionRow } from '@/types'
 import { AdminTransactionActions } from './admin-transaction-actions'
 
 export function AdminTransactionsTable({ items }: { items: AdminTransactionRow[] }) {
   return (
     <div className="rounded-xl border bg-white" style={{ borderColor: colors.border }}>
       <Table>
         <TableHeader>
           <TableRow>
             <TableHead className="px-4">Description</TableHead>
             <TableHead>User</TableHead>
             <TableHead>Account</TableHead>
             <TableHead className="text-right">Amount</TableHead>
             <TableHead>Status</TableHead>
            <TableHead className="text-right pr-4">Actions</TableHead>
           </TableRow>
         </TableHeader>
         <TableBody>
           {items.map((t) => (
             <TableRow key={t.id}>
               <TableCell className="px-4 text-sm" style={{ color: colors.textPrimary }}>
                 {t.description || '—'}
               </TableCell>
               <TableCell>
                 <div className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                   {t.user.name}
                 </div>
                 <div className="text-[11px]" style={{ color: colors.textSecondary }}>
                   {t.user.display_id}
                 </div>
               </TableCell>
               <TableCell className="text-sm" style={{ color: colors.textSecondary }}>
                 {t.account_number}
               </TableCell>
               <TableCell className="text-right text-sm" style={{ color: colors.textPrimary }}>
                 {`${t.currency} ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
               </TableCell>
               <TableCell>
                 <Badge variant="outline" className="border-0">
                   {t.status}
                 </Badge>
               </TableCell>
              <TableCell className="text-right pr-4">
                <AdminTransactionActions tx={t} />
              </TableCell>
             </TableRow>
           ))}
         </TableBody>
       </Table>
     </div>
   )
 }
