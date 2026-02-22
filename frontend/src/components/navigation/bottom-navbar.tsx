'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Wallet,
  ArrowLeftRight,
  LifeBuoy,
  CreditCard,
} from 'lucide-react'

const navigationItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/accounts', label: 'Accounts', icon: Wallet },
  { href: '/dashboard/transfers', label: 'Transfer', icon: ArrowLeftRight },
  { href: '/dashboard/virtual-cards', label: 'Cards', icon: CreditCard },
  { href: '/dashboard/support', label: 'Support', icon: LifeBuoy },
]

export default function BottomNavbar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 xl:hidden z-40" style={{ padding: '0 12px 12px 12px' }}>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'flex-end',
          height: 64,
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 -2px 24px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)',
          paddingBottom: 6,
          paddingTop: 6,
        }}
      >
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                flex: 1,
                height: '100%',
                textDecoration: 'none',
                position: 'relative',
                gap: 2,
              }}
            >
              {isActive ? (
                <>
                  {/* Elevated circle for active icon */}
                  <div
                    style={{
                      position: 'absolute',
                      top: -22,
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      boxShadow: '0 -4px 12px rgba(0,102,204,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0066CC 0%, #0052A3 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={20} color="#FFFFFF" />
                    </div>
                  </div>
                  {/* Label for active */}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#0066CC',
                      marginTop: 28,
                      letterSpacing: 0.2,
                    }}
                  >
                    {item.label}
                  </span>
                </>
              ) : (
                <>
                  <Icon size={20} color="#ADB5BD" />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#ADB5BD',
                    }}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
