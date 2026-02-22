import {
  Home,
  Wallet,
  ArrowLeftRight,
  Receipt,
  PiggyBank,
  ArrowDownCircle,
  CreditCard,
  LifeBuoy,
  User,
} from 'lucide-react'
import type { NavItem, QuickActionItem } from '@/types'

export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/accounts', label: 'Accounts', icon: Wallet },
  { href: '/dashboard/transfers', label: 'Transfers', icon: ArrowLeftRight },
  { href: '/dashboard/bills', label: 'Bills', icon: Receipt },
  { href: '/dashboard/loans', label: 'Loans', icon: PiggyBank },
  { href: '/dashboard/deposits', label: 'Deposits', icon: ArrowDownCircle },
  { href: '/dashboard/virtual-cards', label: 'Cards', icon: CreditCard },
  { href: '/dashboard/support', label: 'Support', icon: LifeBuoy },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
]

export const QUICK_ACTIONS: QuickActionItem[] = [
  {
    href: '/dashboard/transfers',
    label: 'Transfer Funds',
    description: 'Internal & External',
    icon: ArrowLeftRight,
  },
  {
    href: '/dashboard/bills',
    label: 'Pay Bills',
    description: 'Utilities, rent & more',
    icon: Receipt,
  },
  {
    href: '/dashboard/deposits',
    label: 'Deposits',
    description: 'Mobile & direct deposit',
    icon: ArrowDownCircle,
  },
  {
    href: '/dashboard/virtual-cards',
    label: 'Cards',
    description: 'Create virtual cards',
    icon: CreditCard,
  },
  {
    href: '/dashboard/loans',
    label: 'Loans',
    description: 'Apply or manage',
    icon: PiggyBank,
  },
]
