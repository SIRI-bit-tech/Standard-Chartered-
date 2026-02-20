'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { colors } from '@/types'
import type { AdminUserRow } from '@/types'
import { Download, Plus } from 'lucide-react'
import { AdminUserFilters } from './admin-user-filters'
import { AdminUserTable } from './admin-user-table'

export interface AdminUserDirectoryFilters {
  q: string
  status: 'all' | 'active' | 'suspended' | 'inactive'
  verification: 'all' | 'verified' | 'pending' | 'needs_review'
  country: 'all' | string
}

interface AdminUserDirectoryProps {
  items: AdminUserRow[]
  filters: AdminUserDirectoryFilters
  onFiltersChange: (next: AdminUserDirectoryFilters) => void
  onExport: () => void
  onAddUser: () => void
}

export function AdminUserDirectory({
  items,
  filters,
  onFiltersChange,
  onExport,
  onAddUser,
}: AdminUserDirectoryProps) {
  const countries = useMemo(() => {
    const set = new Set(items.map((i) => i.country).filter(Boolean))
    return ['all', ...Array.from(set).sort()]
  }, [items])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            User Directory
          </h1>
          <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
            Manage users, statuses, and verification.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={onAddUser}>
            <Plus className="mr-2 h-4 w-4" />
            Add New User
          </Button>
        </div>
      </div>

      <AdminUserFilters
        countries={countries}
        filters={filters}
        onChange={onFiltersChange}
      />

      <AdminUserTable items={items} />
    </div>
  )
}
