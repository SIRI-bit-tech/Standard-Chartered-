'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  Banknote,
  FileText,
  MessageSquare,
  User,
} from 'lucide-react'

const navigationItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/accounts', label: 'Accounts', icon: CreditCard },
  { href: '/dashboard/transfers', label: 'Transfer', icon: ArrowLeftRight },
  { href: '/dashboard/loans', label: 'Loans', icon: Banknote },
  { href: '/dashboard/bills', label: 'Bills', icon: FileText },
  { href: '/dashboard/support', label: 'Support', icon: MessageSquare },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
]

export default function BottomNavbar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border md:hidden z-40">
      <div className="flex justify-around items-center h-16">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                isActive
                  ? 'text-primary border-t-2 border-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
