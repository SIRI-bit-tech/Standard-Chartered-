'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { HelpCircle, User, LogOut } from 'lucide-react'
import { useAuthStore, useNotificationStore } from '@/lib/store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getInitials } from '@/lib/utils'
import { colors } from '@/types'
import type { Notification } from '@/types'
import { useUserRealtime } from '@/hooks/use-user-realtime'
import { apiClient } from '@/lib/api-client'
import NotificationDrawer from '@/components/NotificationDrawer'

export function DashboardHeader() {
  const router = useRouter()
  const { user, logout, setUser } = useAuthStore()
  const { setNotifications, addNotification } = useNotificationStore()



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
        }>('/api/v1/notifications?limit=100')
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
          <img src="/SCIB logo.svg" alt="SCIB" className="h-14 w-auto drop-shadow-2xl rounded-lg" />
        </Link>
        <div className="ml-auto flex items-center justify-end gap-2">
          <NotificationDrawer />
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
