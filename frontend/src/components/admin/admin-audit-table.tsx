'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { colors } from '@/types'
import type { AdminAuditLog } from '@/types'

export function AdminAuditTable({ items }: { items: AdminAuditLog[] }) {
   return (
     <div className="rounded-xl border bg-white" style={{ borderColor: colors.border }}>
       <Table>
         <TableHeader>
           <TableRow>
             <TableHead className="px-4">Action</TableHead>
             <TableHead>Actor</TableHead>
             <TableHead>Resource</TableHead>
             <TableHead>Details</TableHead>
             <TableHead>Time</TableHead>
           </TableRow>
         </TableHeader>
         <TableBody>
           {items.map((l) => (
             <TableRow key={l.id}>
               <TableCell className="px-4 text-sm" style={{ color: colors.textPrimary }}>
                 {l.action}
               </TableCell>
               <TableCell className="text-sm" style={{ color: colors.textSecondary }}>
                 {l.admin_email}
               </TableCell>
               <TableCell className="text-sm" style={{ color: colors.textSecondary }}>
                 {l.resource_type} • {l.resource_id}
               </TableCell>
               <TableCell className="text-sm max-w-[360px] truncate" style={{ color: colors.textSecondary }}>
                 {l.details || '—'}
               </TableCell>
               <TableCell className="text-sm" style={{ color: colors.textSecondary }}>
                 {new Date(l.created_at).toLocaleString()}
               </TableCell>
             </TableRow>
           ))}
         </TableBody>
       </Table>
     </div>
   )
 }
