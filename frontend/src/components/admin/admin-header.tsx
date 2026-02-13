'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, HelpCircle, Menu, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { colors } from '@/types'
import { apiClient } from '@/lib/api-client'

interface AdminHeaderProps {
  onOpenMobileMenu: () => void
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase()
}

export function AdminHeader({ onOpenMobileMenu }: AdminHeaderProps) {
  const [adminName, setAdminName] = useState('Admin')
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedName = localStorage.getItem('admin_name')
    const email = localStorage.getItem('admin_email')
    if (storedName && storedName.trim()) {
      setAdminName(storedName)
    } else if (email) {
      setAdminName(email)
    }

    // Fetch real notifications count for the current admin (if any).
    ;(async () => {
      try {
        const hasToken =
          !!(localStorage.getItem('access_token') || document.cookie.includes('accessToken='))
        if (!hasToken) return
        const res = await apiClient.get<{ success: boolean; data: { id: string }[] }>(
          '/api/v1/notifications?limit=10',
        )
        if (res.success && Array.isArray(res.data)) {
          setNotificationCount(res.data.length)
        }
      } catch {
        // If notifications fail, leave count at 0.
      }
    })()
  }, [])

  const initials = useMemo(() => getInitials(adminName), [adminName])

  return (
    <header className="sticky top-0 z-40 border-b bg-white" style={{ borderColor: colors.border }}>
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onOpenMobileMenu}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="relative w-[280px] max-w-[55vw] sm:w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search transactions, accounts..." />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
                style={{ backgroundColor: colors.error }}
              >
                {notificationCount}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Help">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <div className="hidden items-center gap-2 rounded-full border px-2 py-1 sm:flex" style={{ borderColor: colors.border }}>
            <Avatar className="h-7 w-7">
              <AvatarFallback style={{ backgroundColor: colors.primaryLight, color: colors.primary }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium" style={{ color: colors.textPrimary }}>
              {adminName.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
