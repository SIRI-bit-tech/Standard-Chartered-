'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, HelpCircle, Menu, Search, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { colors } from '@/types'
import { useRouter } from 'next/navigation'

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
  const [adminEmail, setAdminEmail] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedName = localStorage.getItem('admin_name')
    const email = localStorage.getItem('admin_email')
    if (storedName && storedName.trim()) {
      setAdminName(storedName)
    } else if (email) {
      setAdminName(email)
    }
    if (email) {
      setAdminEmail(email)
    }
  }, [])

  const initials = useMemo(() => getInitials(adminName), [adminName])

  const handleLogout = () => {
    // Clear admin session data
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_id')
    localStorage.removeItem('admin_name')
    localStorage.removeItem('admin_email')
    localStorage.removeItem('admin_username')
    
    // Redirect to admin login
    router.push('/admin/auth/login')
  }

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
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Help">
            <HelpCircle className="h-5 w-5" />
          </Button>
          
          {/* Admin Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="hidden items-center gap-2 rounded-full border px-2 py-1 sm:flex hover:bg-gray-50" 
                style={{ borderColor: colors.border }}
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback style={{ backgroundColor: colors.primaryLight, color: colors.primary }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium" style={{ color: colors.textPrimary }}>
                  {adminName.toUpperCase()}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{adminName}</p>
                  {adminEmail && (
                    <p className="text-xs leading-none text-muted-foreground">{adminEmail}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Mobile Avatar (no dropdown on mobile) */}
          <div className="flex items-center gap-2 rounded-full border px-2 py-1 sm:hidden" style={{ borderColor: colors.border }}>
            <Avatar className="h-7 w-7">
              <AvatarFallback style={{ backgroundColor: colors.primaryLight, color: colors.primary }}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  )
}
