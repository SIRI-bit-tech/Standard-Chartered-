'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DASHBOARD_NAV_ITEMS } from '@/constants/dashboard'
import { NeedHelpCard } from './need-help-card'
import { cn } from '@/lib/utils'
import { colors } from '@/types'

function NavLinks({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname()

  return (
    <>
      {DASHBOARD_NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-white/15 text-white'
                : 'text-white/90 hover:bg-white/10 hover:text-white',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </>
  )
}

export function SidebarContent({ onLinkClick }: { onLinkClick?: () => void } = {}) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <nav className="flex flex-1 flex-col gap-1">
        <NavLinks onLinkClick={onLinkClick} />
      </nav>
      <NeedHelpCard />
    </div>
  )
}

interface DashboardSidebarProps { }

export function DashboardSidebar({ }: DashboardSidebarProps) {
  return (
    <aside
      className="hidden w-64 flex-col border-r xl:flex"
      style={{ backgroundColor: colors.primary, borderColor: colors.primaryDark }}
    >
      <SidebarContent />
    </aside>
  )
}
