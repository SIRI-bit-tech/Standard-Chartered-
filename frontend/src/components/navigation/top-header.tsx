'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Bell, User, LogOut, Settings } from 'lucide-react'

export default function TopHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-border shadow-sm sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <img 
            src="/logo.png" 
            alt="SC Bank" 
            className="h-10 w-auto"
          />
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-border rounded-lg relative hidden sm:block">
            <Bell size={20} className="text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-border rounded-lg hidden sm:block"
            >
              <User size={20} className="text-muted-foreground" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-border rounded-lg shadow-lg">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition text-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User size={18} />
                  <span>Profile</span>
                </Link>
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition text-sm border-t border-border"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings size={18} />
                  <span>Settings</span>
                </Link>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 transition text-sm border-t border-border"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
