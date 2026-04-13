'use client'

import { useState } from 'react'
import { Bell, CheckCheck, Clock, Info, Shield, Landmark } from 'lucide-react'
import { useNotificationStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDate } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import type { Notification } from '@/types'
import { colors } from '@/types'

export default function NotificationDrawer() {
  const { notifications, markAsRead, markAllRead, unreadCount } = useNotificationStore()
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null)
  const hasUnread = unreadCount > 0

  const handleMarkAllRead = async () => {
    try {
      await apiClient.put('/api/v1/notifications/read-all', {})
      markAllRead()
    } catch (err) {
      console.error('Failed to mark all as read', err)
      markAllRead()
    }
  }

  const handleNotifClick = async (n: Notification) => {
    setSelectedNotif(n)
    if (n.status === 'unread') {
      try {
        await apiClient.put(`/api/v1/notifications/${n.id}/read`, {})
        markAsRead(n.id)
      } catch (err) {
        console.error('Failed to mark as read', err)
        markAsRead(n.id)
      }
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="h-4 w-4 text-error" />
      case 'loan': return <Landmark className="h-4 w-4 text-primary" />
      case 'transaction': return <Info className="h-4 w-4 text-blue-500" />
      default: return <Bell className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <>
      <Drawer direction="right">
        <DrawerTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
             <Bell className="h-5 w-5" style={{ color: colors.textSecondary }} />
             {hasUnread && (
               <span
                 className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white animate-pulse"
                 style={{ backgroundColor: colors.error }}
               >
                 {unreadCount > 9 ? '9+' : unreadCount}
               </span>
             )}
           </Button>
        </DrawerTrigger>
        <DrawerContent className="h-full w-full sm:max-w-md right-0 left-auto rounded-none border-l">
          <DrawerHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="text-2xl font-black tracking-tight">Notifications</DrawerTitle>
                <DrawerDescription className="font-medium">
                  {unreadCount > 0 ? `You have ${unreadCount} unread updates` : 'Stay updated with your account activity'}
                </DrawerDescription>
              </div>
              {notifications.length > 0 && hasUnread && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-8 text-xs gap-1 font-bold">
                  <CheckCheck className="h-3 w-3" />
                  Read all
                </Button>
              )}
            </div>
          </DrawerHeader>

          <ScrollArea className="flex-1 px-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
                  <Bell className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-bold text-muted-foreground">No new notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`group cursor-pointer p-5 hover:bg-muted/30 transition-all relative ${n.status === 'unread' ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 p-2 rounded-xl shrink-0 ${n.status === 'unread' ? 'bg-white shadow-sm ring-1 ring-border' : 'bg-muted/50'}`}>
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm tracking-tight ${n.status === 'unread' ? 'font-black text-foreground' : 'font-bold text-muted-foreground'}`}>{n.title}</p>
                          {n.status === 'unread' && <div className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{n.message}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <Clock className="h-3 w-3 text-muted-foreground/60" />
                          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{formatDate(n.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-6 border-t bg-muted/10">
            <DrawerClose asChild>
              <Button className="w-full font-black rounded-xl h-12" variant="outline">
                Close Panel
              </Button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Notification Detail Modal */}
      <Dialog open={!!selectedNotif} onOpenChange={(open) => !open && setSelectedNotif(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8">
          <DialogHeader className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto sm:mx-0">
              {selectedNotif && getIcon(selectedNotif.type)}
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black tracking-tight">{selectedNotif?.title}</DialogTitle>
              <DialogDescription className="font-bold flex items-center gap-2">
                <Clock className="h-3 w-3" />
                {selectedNotif && formatDate(selectedNotif.created_at)}
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="py-6 border-y border-border/50 my-6">
            <p className="text-base leading-relaxed text-foreground font-medium whitespace-pre-wrap">
              {selectedNotif?.message}
            </p>
          </div>
          <div className="flex justify-end">
             <Button onClick={() => setSelectedNotif(null)} className="rounded-xl font-black px-8">
               Got it
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
