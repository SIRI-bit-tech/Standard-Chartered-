'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { AdminUserDirectory, type AdminUserDirectoryFilters } from '@/components/admin/admin-user-directory'
import type { AdminUsersListResponse, AdminUserRow } from '@/types'
import { useAdminRealtime } from '@/hooks/use-admin-realtime'

export default function UsersPage() {
  const [items, setItems] = useState<AdminUserRow[]>([])
  const [filters, setFilters] = useState<AdminUserDirectoryFilters>({
    q: '',
    status: 'all',
    verification: 'all',
    country: 'all',
  })

  async function fetchUsers() {
    try {
      const adminId = localStorage.getItem('admin_id')
      if (!adminId) {
        window.location.href = '/admin/auth/login'
        return
      }
      const qs = new URLSearchParams({
        admin_id: adminId,
        q: filters.q,
        status_filter: filters.status,
        verification_filter: filters.verification,
        country: filters.country,
        page: '1',
        page_size: '10',
      })
      const res = await apiClient.get<{ success: boolean; data: AdminUsersListResponse }>(
        `/admin/users/list?${qs.toString()}`,
      )
      if (res.success) setItems(res.data.items)
    } catch (err: any) {
      logger.error('Failed to fetch users list', { error: err })
    }
  }

  useEffect(() => {
    const debounce = setTimeout(fetchUsers, 250)
    return () => clearTimeout(debounce)
  }, [filters.q, filters.status, filters.verification, filters.country])

  useAdminRealtime('admin:users', () => {
    fetchUsers()
  })

  return (
    <AdminUserDirectory
      items={items}
      filters={filters}
      onFiltersChange={setFilters}
      onExport={() => {
        // Minimal export: download current page as CSV.
        const header = ['User ID', 'Name', 'Country', 'Email', 'Status', 'Verification']
        const rows = items.map((u) => [u.user_id, u.name, u.country, u.email, u.status, u.verification])
        const csv = [header, ...rows].map((r) => r.map((c) => {
          const str = String(c)
          // Detect potential formula injection
          if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
            return `"'"${str.replace(/"/g, '""')}"`
          }
          return `"${str.replace(/"/g, '""')}"`
        }).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'users-export.csv'
        a.click()
        URL.revokeObjectURL(url)
      }}
      onAddUser={() => {
        // Hook point: connect to the existing create-user endpoint in a modal.
        alert('Add New User: hook up modal next')
      }}
    />
  )
}
