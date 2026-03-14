'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Bell, HelpCircle, User, LogOut, Check, CheckCheck } from 'lucide-react'
import { useAuthStore, useNotificationStore } from '@/lib/store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getInitials, formatDate } from '@/lib/utils'
import { colors } from '@/types'
import type { Notification } from '@/types'
import { useUserRealtime } from '@/hooks/use-user-realtime'
import { apiClient } from '@/lib/api-client'

export function DashboardHeader() {
  const router = useRouter()
  const { user, logout, setUser } = useAuthStore()
  const { notifications, setNotifications, addNotification, markAsRead, markAllRead, unreadCount } = useNotificationStore()
  const hasUnread = unreadCount > 0

  const handleMarkAllRead = async () => {
    try {
      await apiClient.put('/api/v1/notifications/read-all', {})
      markAllRead()
    } catch (err) {
      console.error('Failed to mark all as read', err)
      // Fallback update local state anyway
      markAllRead()
    }
  }

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Check if already read to avoid redundant calls
    const n = notifications.find(notif => notif.id === id)
    if (n?.status === 'read') return

    try {
      await apiClient.put(`/api/v1/notifications/${id}/read`, {})
      markAsRead(id)
    } catch (err) {
      console.error('Failed to mark as read', err)
      markAsRead(id)
    }
  }

  useEffect(() => {
    let active = true
      ; (async () => {
        try {
          if (!user || user.profile_picture_url) return
          const res = await apiClient.get<{ success: boolean; data: any }>('/api/v1/profile')
          if (!active) return
          if (res?.success && res?.data && setUser) {
            setUser({ ...user, profile_picture_url: res.data.profile_picture_url || user.profile_picture_url })
          }
        } catch { }
      })()
    return () => {
      active = false
    }
  }, [user, setUser])

  // Hydrate notifications from API so existing in-app notifications appear even before realtime updates
  useEffect(() => {
    if (!user?.id) return
    let active = true
    ; (async () => {
      try {
        const res = await apiClient.get<{
          success: boolean
          data: { id: string; title: string; message: string; type: any; status: any; created_at: string }[]
        }>('/api/v1/notifications?limit=20')
        if (!active) return
        if (res.success && Array.isArray(res.data)) {
          const mapped: Notification[] = res.data.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            status: n.status,
            created_at: n.created_at,
          }))
          setNotifications(mapped)
        }
      } catch {
        // Ignore failures; realtime channel may still populate notifications
      }
    })()
    return () => {
      active = false
    }
  }, [user?.id, setNotifications])

  const notifChannel = user?.id ? `banking:notifications:${user.id}` : undefined
  useUserRealtime(notifChannel as string, (payload) => {
    if (payload?.title && payload?.message) {
      const id = payload?.data?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const created_at = payload?.data?.created_at || new Date().toISOString()
      const newNotif: Notification = {
        id,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        status: 'unread',
        created_at,
      }
      addNotification(newNotif)
    }
  })
  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  if (!user) return null

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email

  return (
    <header
      className="sticky top-0 z-40 border-b bg-background"
      style={{ borderColor: colors.border }}
    >
      <div className="flex h-14 items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center shrink-0">
          <img src="/logo.png" alt="Standard Chartered" className="h-8 w-auto" />
        </Link>
        <div className="ml-auto flex items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="h-5 w-5" style={{ color: colors.textSecondary }} />
                {hasUnread && (
                  <span
                    className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{ backgroundColor: colors.error }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: colors.border }}>
                <span className="text-sm font-semibold" style={{ color: colors.textPrimary }}>Notifications</span>
                {notifications.length > 0 && hasUnread && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 text-xs flex items-center gap-1"
                    onClick={handleMarkAllRead}
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Read all
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-80">
                {notifications.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm" style={{ color: colors.textSecondary }}>
                    No new notifications
                  </div>
                ) : (
                  <div className="py-1">
                    {notifications.slice(0, 10).map((n: Notification) => (
                      <button
                        key={n.id}
                        type="button"
                        className={`group relative w-full border-b px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${n.status === 'unread' ? 'bg-blue-50/30' : ''}`}
                        style={{ borderColor: colors.border }}
                        onClick={() => handleMarkRead(n.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {n.status === 'unread' && (
                                <span 
                                  className="h-2 w-2 rounded-full shrink-0" 
                                  style={{ backgroundColor: colors.primary }}
                                  title="Unread"
                                />
                              )}
                              <p className={`text-sm ${n.status === 'unread' ? 'font-semibold' : 'font-medium'}`} style={{ color: colors.textPrimary }}>
                                {n.title}
                              </p>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed" style={{ color: colors.textSecondary }}>{n.message}</p>
                            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: colors.gray500 }}>
                              {formatDate(n.created_at)}
                            </p>
                          </div>
                          
                          {n.status === 'unread' && (
                            <div className="flex h-6 w-6 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <Check className="h-4 w-4" style={{ color: colors.primary }} />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/support" aria-label="Help">
              <HelpCircle className="h-5 w-5" style={{ color: colors.textSecondary }} />
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  {user.profile_picture_url ? (
                    <AvatarImage src={user.profile_picture_url} alt={displayName} />
                  ) : null}
                  <AvatarFallback
                    className="text-xs font-medium"
                    style={{
                      backgroundColor: colors.primaryLight,
                      color: colors.primary,
                    }}
                  >
                    {getInitials(user.first_name, user.last_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-left text-sm font-medium sm:block" style={{ color: colors.textPrimary }}>
                  {displayName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
