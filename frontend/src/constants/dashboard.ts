import {
  Home,
  Wallet,
  ArrowLeftRight,
  Receipt,
  PiggyBank,
  CircleArrowOutDownLeft,
  CircleArrowOutUpRight,
  CreditCard,
  LifeBuoy,
  User,
  ShieldCheck,
} from 'lucide-react'
import type { NavItem, QuickActionItem } from '@/types'

export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/accounts', label: 'Accounts', icon: Wallet },
  { href: '/dashboard/transfers', label: 'Transfers', icon: ArrowLeftRight },
  { href: '/dashboard/withdraw', label: 'Withdraw', icon: CircleArrowOutUpRight },
  { href: '/dashboard/bills', label: 'Bills', icon: Receipt },
  { href: '/dashboard/loans', label: 'Loans', icon: PiggyBank },
  { href: '/dashboard/deposits', label: 'Deposits', icon: CircleArrowOutDownLeft },
  { href: '/dashboard/virtual-cards', label: 'Cards', icon: CreditCard },
  { href: '/dashboard/security', label: 'Security', icon: ShieldCheck },
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
    href: '/dashboard/withdraw',
    label: 'Withdraw Funds',
    description: 'Withdraw to your own accounts',
    icon: CircleArrowOutUpRight,
    className: 'xl:hidden',
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
    icon: CircleArrowOutDownLeft,
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
