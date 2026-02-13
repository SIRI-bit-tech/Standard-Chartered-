'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { colors } from '@/types'
import {
  LayoutDashboard,
  Users,
  Landmark,
  ArrowLeftRight,
  Shield,
  BarChart3,
  Settings,
  CreditCard,
} from 'lucide-react'

interface AdminSidebarProps {
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

const NAV = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/accounts', label: 'Accounts', icon: Landmark },
  { href: '/admin/cards', label: 'Virtual Cards', icon: CreditCard },
  { href: '/admin/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/admin/security', label: 'Security', icon: Shield },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings', label: 'System Settings', icon: Settings },
] as const

function SidebarContent() {
  const pathname = usePathname()
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: colors.primary }}
          >
            <Landmark className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
              Standard Chartered
            </p>
            <p className="text-xs" style={{ color: colors.textSecondary }}>
              Admin Portal
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 pb-6">
        <div className="space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-primary/10' : 'hover:bg-muted',
                )}
                style={{ color: active ? colors.primary : colors.textSecondary }}
              >
                <Icon className="h-4 w-4" />
                <span style={{ color: active ? colors.primary : colors.textPrimary }}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="px-6 pb-6">
        <div className="rounded-xl border p-4" style={{ borderColor: colors.border }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
            Admin Director
          </p>
          <p className="mt-1 text-sm font-medium" style={{ color: colors.textPrimary }}>
            HQ-Central Division
          </p>
        </div>
      </div>
    </div>
  )
}

export function AdminSidebar({ mobileOpen, onMobileOpenChange }: AdminSidebarProps) {
  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r bg-white md:block" style={{ borderColor: colors.border }}>
        <SidebarContent />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="p-0 w-80">
          <div className="h-full bg-white">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
