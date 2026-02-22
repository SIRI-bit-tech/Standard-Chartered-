'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Bell, HelpCircle, User, LogOut } from 'lucide-react'
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
  const { notifications, setNotifications, addNotification } = useNotificationStore()
  const hasUnread = notifications.some((n) => n.status === 'unread')

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
                    className="absolute right-1 top-1 h-2 w-2 rounded-full"
                    style={{ backgroundColor: colors.error }}
                  />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: colors.border }}>
                <span className="text-sm font-semibold" style={{ color: colors.textPrimary }}>Notifications</span>
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 text-xs"
                    onClick={() => setNotifications([])}
                  >
                    Clear all
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
                      <div
                        key={n.id}
                        className="border-b px-3 py-2.5 last:border-b-0"
                        style={{ borderColor: colors.border }}
                      >
                        <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{n.title}</p>
                        <p className="mt-0.5 text-xs" style={{ color: colors.textSecondary }}>{n.message}</p>
                        <p className="mt-1 text-xs" style={{ color: colors.gray500 }}>{formatDate(n.created_at)}</p>
                      </div>
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
