'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CountrySelector } from '@/components/ui/country-selector'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'

type UserDetail = {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  phone?: string | null
  country?: string | null
  street_address?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  created_at?: string | null
  is_active?: boolean
}

export function AdminEditUserDialog({
  open,
  onOpenChange,
  userId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  userId: string | null
  onSaved?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<UserDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [originalJoinedAt, setOriginalJoinedAt] = useState<string | null>(null)
  const todayISO = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    async function fetchDetail() {
      if (!open || !userId) return
      try {
        setLoading(true)
        setError(null)
        const adminId = localStorage.getItem('admin_id')
        if (!adminId) {
          window.location.href = '/admin/auth/login'
          return
        }
        const qs = new URLSearchParams({ admin_id: adminId, user_id: userId })
        const res = await apiClient.get<{ success: boolean; data: UserDetail }>(`/admin/users/detail?${qs.toString()}`, {
          headers: { 'X-Show-Loader': '1' }
        })
        if (res?.success) {
          setForm(res.data)
          setOriginalJoinedAt(res.data.created_at || null)
        }
      } catch (e: any) {
        logger.error('Failed to fetch user detail', { error: e })
        setError('Failed to load user details')
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [open, userId])

  async function handleSave() {
    if (!form) return
    try {
      setLoading(true)
      const adminId = localStorage.getItem('admin_id')
      if (!adminId) {
        window.location.href = '/admin/auth/login'
        return
      }
      const qs = new URLSearchParams({ admin_id: adminId })
      const payload: any = {
        user_id: form.id,
        email: form.email,
        username: form.username,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone ?? '',
        country: form.country ?? '',
        street_address: form.street_address ?? '',
        city: form.city ?? '',
        state: form.state ?? '',
        postal_code: form.postal_code ?? '',
      }
      if (form.created_at) {
        const newDt = new Date(form.created_at)
        const now = new Date()
        if (newDt.getTime() > now.getTime()) {
          setError('Date Joined cannot be in the future')
          setLoading(false)
          return
        }
        payload.date_joined = newDt.toISOString()
      }
      await apiClient.put(`/admin/users/edit?${qs.toString()}`, payload, {
        headers: { 'X-Show-Loader': '1' }
      })
      onOpenChange(false)
      if (onSaved) onSaved()
    } catch (e: any) {
      logger.error('Failed to save user detail', { error: e })
      setError('Failed to save changes')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Edit User</DialogTitle>
      </DialogHeader>
      <DialogContent className="mx-auto w-[92vw] sm:max-w-lg md:max-w-xl p-0 rounded-xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Edit User</h3>
          <p className="text-sm text-muted-foreground">Update registration details. Password is not editable here.</p>
        </div>
        <div className="p-4 pt-3 flex-1 overflow-y-auto">
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          {!form ? (
            <div className="py-10 text-sm text-muted-foreground">{loading ? 'Loading user…' : 'No user selected'}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm">First Name</label>
                <Input value={form.first_name || ''} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm">Last Name</label>
                <Input value={form.last_name || ''} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Email</label>
                <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-sm">Username</label>
                <Input value={form.username || ''} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Phone</label>
                <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-sm">Country</label>
                <CountrySelector value={form.country || ''} onChange={(v) => setForm({ ...form, country: v })} />
              </div>
              </div>
              <div>
              <label className="text-sm">Street Address</label>
              <Input value={form.street_address || ''} onChange={(e) => setForm({ ...form, street_address: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm">City</label>
                <Input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label className="text-sm">State/Province</label>
                <Input value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
              <div>
                <label className="text-sm">Postal Code</label>
                <Input value={form.postal_code || ''} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
              </div>
              </div>
              <div>
            <label className="text-sm">Date Joined</label>
            <Input
              type="date"
              value={form.created_at ? form.created_at.slice(0, 10) : ''}
              max={todayISO}
              onChange={(e) => {
                const v = e.target.value
                if (!v) {
                  setForm({ ...form, created_at: null })
                } else {
                  const iso = new Date(v + 'T00:00:00Z').toISOString()
                  setForm({ ...form, created_at: iso })
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">Can be set to any past date (not future).</p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="p-4 border-t">
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading || !form}>{loading ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
