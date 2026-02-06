'use client'

import React from "react"

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Edit2 } from 'lucide-react'

interface User {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  country: string
  created_at: string
  is_active: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    phone: '',
    country: ''
  })

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const adminId = localStorage.getItem('admin_id')
      await apiClient.post('/admin/users/create', {
        admin_id: adminId,
        ...formData
      })

      setFormData({ email: '', username: '', first_name: '', last_name: '', phone: '', country: '' })
      setShowCreateForm(false)
      logger.debug('User created successfully')
    } catch (err: any) {
      logger.error('User creation failed', { error: err })
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setLoading(true)
    try {
      const adminId = localStorage.getItem('admin_id')
      await apiClient.put('/admin/users/edit', {
        admin_id: adminId,
        user_id: editingUser.id,
        ...formData
      })

      setEditingUser(null)
      setFormData({ email: '', username: '', first_name: '', last_name: '', phone: '', country: '' })
      logger.debug('User updated successfully')
    } catch (err: any) {
      logger.error('User update failed', { error: err })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">User Management</h2>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-primary hover:bg-primary-dark text-white"
        >
          <Plus size={18} className="mr-2" />
          Create User
        </Button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Create New User</h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                disabled={loading}
              />
              <Input
                type="text"
                placeholder="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
            />

            <Input
              type="text"
              placeholder="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              disabled={loading}
            />

            <Input
              type="tel"
              placeholder="Phone (Optional)"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={loading}
            />

            <Input
              type="text"
              placeholder="Country Code (e.g., US, UK)"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              required
              disabled={loading}
              maxLength={2}
            />

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-success hover:bg-success-dark text-white"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Create User'}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setFormData({ email: '', username: '', first_name: '', last_name: '', phone: '', country: '' })
                }}
                className="flex-1 bg-border hover:bg-border text-foreground"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Users List */}
      <div className="space-y-3">
        {users.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No users found</p>
          </Card>
        ) : (
          users.map(user => (
            <Card key={user.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{user.first_name} {user.last_name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Joined: {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>

              <Button
                onClick={() => setEditingUser(user)}
                className="bg-primary hover:bg-primary-dark text-white"
              >
                <Edit2 size={18} />
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
