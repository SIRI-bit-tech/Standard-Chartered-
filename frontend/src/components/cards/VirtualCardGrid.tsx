 'use client'
 
 import { useState } from 'react'
 import { Button } from '@/components/ui/button'
 import { Badge } from '@/components/ui/badge'
 import { VirtualCard3D } from './VirtualCard3D'
 import { apiClient } from '@/lib/api-client'
 import { logger } from '@/lib/logger'
 import type { VirtualCardSummary } from '@/types'
 import { Copy, Lock, Unlock, Trash2 } from 'lucide-react'
 
 interface Props {
   cards: VirtualCardSummary[]
   onRefresh: () => void
 }
 
 export function VirtualCardGrid({ cards, onRefresh }: Props) {
   const [busy, setBusy] = useState<string | null>(null)
 
   async function freeze(card: VirtualCardSummary) {
     setBusy(card.id)
     try {
      await apiClient.post(`/api/v1/cards/${card.id}/block`, { reason: 'user freeze' })
       onRefresh()
     } catch (e) {
       logger.error('Freeze card failed', { error: e })
     } finally {
       setBusy(null)
     }
   }
 
   async function unfreeze(card: VirtualCardSummary) {
     setBusy(card.id)
     try {
      await apiClient.post(`/api/v1/cards/${card.id}/unblock`, {})
       onRefresh()
     } catch (e) {
       logger.error('Unfreeze card failed', { error: e })
     } finally {
       setBusy(null)
     }
   }
 
   async function remove(card: VirtualCardSummary) {
     setBusy(card.id)
     try {
      await apiClient.delete(`/api/v1/cards/${card.id}`)
       onRefresh()
     } catch (e) {
       logger.error('Delete card failed', { error: e })
     } finally {
       setBusy(null)
     }
   }
 
   function copyNumber(card: VirtualCardSummary) {
     try {
       navigator.clipboard.writeText(card.card_number || '')
     } catch {}
   }
 
   return (
     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
       {cards.map((card) => (
         <div key={card.id} className="rounded-xl border bg-white p-4 shadow-sm">
           <div className="flex items-center justify-between">
             <div className="text-sm font-semibold">{card.card_name}</div>
             <Badge variant="outline" className="border-0 text-xs capitalize">
               {card.status === 'suspended' ? 'frozen' : card.status}
             </Badge>
           </div>
           <div className="mt-3">
             <VirtualCard3D card={card} />
           </div>
           <div className="mt-3 flex items-center justify-between">
             <Button variant="ghost" size="sm" className="gap-2" onClick={() => copyNumber(card)}>
               <Copy className="h-4 w-4" />
               Copy
             </Button>
             {card.status === 'blocked' || card.status === 'suspended' ? (
               <Button variant="ghost" size="sm" className="gap-2" disabled={busy === card.id} onClick={() => unfreeze(card)}>
                 <Unlock className="h-4 w-4" />
                 Unfreeze
               </Button>
             ) : (
               <Button variant="ghost" size="sm" className="gap-2" disabled={busy === card.id} onClick={() => freeze(card)}>
                 <Lock className="h-4 w-4" />
                 Freeze
               </Button>
             )}
             <Button variant="ghost" size="sm" className="gap-2" disabled={busy === card.id} onClick={() => remove(card)}>
               <Trash2 className="h-4 w-4" />
               Delete
             </Button>
           </div>
         </div>
       ))}
     </div>
   )
 }
