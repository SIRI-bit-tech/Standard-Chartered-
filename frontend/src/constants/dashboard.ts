import {
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  FileText,
  Landmark,
  Wallet,
  MessageSquare,
  User,
  Send,
} from 'lucide-react'
import type { NavItem, QuickActionItem } from '@/types'

export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/accounts', label: 'Accounts', icon: CreditCard },
  { href: '/dashboard/transfers', label: 'Transfers', icon: ArrowLeftRight },
  { href: '/dashboard/bills', label: 'Bills', icon: FileText },
  { href: '/dashboard/loans', label: 'Loans', icon: Landmark },
  { href: '/dashboard/deposits', label: 'Deposits', icon: Wallet },
  { href: '/dashboard/virtual-cards', label: 'Cards', icon: Wallet },
  { href: '/dashboard/support', label: 'Support', icon: MessageSquare },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
]

export const QUICK_ACTIONS: QuickActionItem[] = [
  {
    href: '/dashboard/transfers',
    label: 'Transfer Funds',
    description: 'Internal & External',
    icon: Send,
  },
  {
    href: '/dashboard/bills',
    label: 'Pay Bills',
    description: 'Utilities, rent & more',
    icon: FileText,
  },
  {
    href: '/dashboard/loans',
    label: 'Loans',
    description: 'Apply for a loan',
    icon: Landmark,
  },
  {
    href: '/dashboard/profile',
    label: 'Profile',
    description: 'Settings & security',
    icon: User,
  },
]
