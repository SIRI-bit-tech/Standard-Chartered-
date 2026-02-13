 'use client'
 
 import { useEffect, useState } from 'react'
 import { colors } from '@/types'
 import { Card } from '@/components/ui/card'
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
 import { Badge } from '@/components/ui/badge'
 import { Button } from '@/components/ui/button'
 import { apiClient } from '@/lib/api-client'
 import { logger } from '@/lib/logger'
 import { Lock, Unlock, Ban, CheckCircle, Clock } from 'lucide-react'
 
 interface AdminCardRow {
   id: string
   user_id: string
   account_id: string
   card_type: string
   status: string
   card_name: string
   created_at?: string | null
 }
 
 export default function AdminCardsPage() {
   const [items, setItems] = useState<AdminCardRow[]>([])
 
   async function fetchCards() {
     try {
       const adminId = localStorage.getItem('admin_id')
       if (!adminId) {
         window.location.href = '/admin/auth/login'
         return
       }
       const qs = new URLSearchParams({ admin_id: adminId })
       const res = await apiClient.get<{ items: AdminCardRow[] }>(`/admin/cards/list?${qs.toString()}`)
       setItems(res.items ?? [])
     } catch (e) {
       logger.error('Failed to load cards', { error: e })
     }
   }
 
   useEffect(() => {
     fetchCards()
   }, [])
 
   async function setStatus(id: string, status: 'pending' | 'active') {
     try {
       const adminId = localStorage.getItem('admin_id')!
       const qs = new URLSearchParams({ admin_id: adminId })
       await apiClient.put(`/admin/cards/status?${qs.toString()}`, { card_id: id, status })
       fetchCards()
     } catch (e) {
       logger.error('Failed to update status', { error: e })
     }
   }
 
   async function freeze(id: string) {
     try {
       const adminId = localStorage.getItem('admin_id')!
       const qs = new URLSearchParams({ admin_id: adminId })
       await apiClient.post(`/admin/cards/freeze?${qs.toString()}`, { card_id: id })
       fetchCards()
     } catch (e) {
       logger.error('Failed to freeze card', { error: e })
     }
   }
 
   async function unfreeze(id: string) {
     try {
       const adminId = localStorage.getItem('admin_id')!
       const qs = new URLSearchParams({ admin_id: adminId })
       await apiClient.post(`/admin/cards/unfreeze?${qs.toString()}`, { card_id: id })
       fetchCards()
     } catch (e) {
       logger.error('Failed to unfreeze card', { error: e })
     }
   }
 
   async function block(id: string) {
     try {
       const adminId = localStorage.getItem('admin_id')!
       const qs = new URLSearchParams({ admin_id: adminId })
       await apiClient.post(`/admin/cards/block?${qs.toString()}`, { card_id: id })
       fetchCards()
     } catch (e) {
       logger.error('Failed to block card', { error: e })
     }
   }
 
   return (
     <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
           Virtual Cards
         </h1>
         <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
           Review applications and manage card status
         </p>
       </div>
 
       <Card className="p-6">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>User</TableHead>
               <TableHead>Card</TableHead>
               <TableHead>Status</TableHead>
               <TableHead className="text-right">Actions</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {items.map((it) => (
               <TableRow key={it.id}>
                 <TableCell className="text-sm" style={{ color: colors.textSecondary }}>
                   {it.user_id}
                 </TableCell>
                 <TableCell className="text-sm" style={{ color: colors.textPrimary }}>
                   {it.card_name} • {it.card_type}
                 </TableCell>
                 <TableCell>
                   <Badge variant="outline" className="border-0 text-xs capitalize">
                     {it.status === 'suspended' ? 'frozen' : it.status}
                   </Badge>
                 </TableCell>
                 <TableCell className="text-right">
                   <div className="flex justify-end gap-2">
                     <Button size="sm" variant="outline" className="gap-1" onClick={() => setStatus(it.id, 'pending')}>
                       <Clock className="h-4 w-4" />
                       Pending
                     </Button>
                     <Button size="sm" variant="outline" className="gap-1" onClick={() => setStatus(it.id, 'active')}>
                       <CheckCircle className="h-4 w-4" />
                       Complete
                     </Button>
                     {it.status === 'active' ? (
                       <Button size="sm" variant="outline" className="gap-1" onClick={() => freeze(it.id)}>
                         <Lock className="h-4 w-4" />
                         Freeze
                       </Button>
                     ) : it.status === 'suspended' ? (
                       <Button size="sm" variant="outline" className="gap-1" onClick={() => unfreeze(it.id)}>
                         <Unlock className="h-4 w-4" />
                         Unfreeze
                       </Button>
                     ) : null}
                     <Button size="sm" variant="destructive" className="gap-1" onClick={() => block(it.id)}>
                       <Ban className="h-4 w-4" />
                       Block
                     </Button>
                   </div>
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>
       </Card>
     </div>
   )
 }
