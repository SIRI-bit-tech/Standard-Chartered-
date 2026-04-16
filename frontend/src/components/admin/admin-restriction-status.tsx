'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import { Lock, Ban, ShieldCheck } from 'lucide-react'

type RestrictionType = 'post_no_debit' | 'online_banking'

interface UserRestriction {
  id: string
  restriction_type: RestrictionType
  is_active: boolean
  message: string
  created_at: string
  created_by: string | null
}

interface RestrictionStatusProps {
  userId: string
  userName: string
}

export function AdminRestrictionStatus({ userId, userName }: RestrictionStatusProps) {
  const [restrictions, setRestrictions] = useState<UserRestriction[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRestrictions = async () => {
    try {
      setLoading(true)
      const adminId = localStorage.getItem('admin_id')
      const adminToken = localStorage.getItem('admin_token')
      
      if (!adminId || !adminToken) {
        window.location.href = '/admin/auth/login'
        return
      }

      apiClient.setAuthToken(adminToken)
      
      const response = await apiClient.get<{ success: boolean; restrictions: UserRestriction[] }>(`/admin/users/${userId}/restrictions?admin_id=${adminId}`)
      if (response.success) {
        setRestrictions(response.restrictions)
      }
    } catch (err: any) {
      logger.error('Failed to fetch restrictions', { error: err })
      toast.error('Failed to fetch restrictions')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveRestriction = async (restrictionType: RestrictionType) => {
    try {
      const adminId = localStorage.getItem('admin_id')
      const adminToken = localStorage.getItem('admin_token')
      
      if (!adminId || !adminToken) {
        window.location.href = '/admin/auth/login'
        return
      }

      apiClient.setAuthToken(adminToken)
      
      await apiClient.delete(`/admin/users/restrict?admin_id=${adminId}`, {
        data: {
          user_id: userId,
          restriction_type: restrictionType
        }
      })

      toast.success(`${getRestrictionDisplayName(restrictionType)} restriction removed successfully`)
      fetchRestrictions() // Refresh the list
    } catch (err: any) {
      logger.error('Failed to remove restriction', { error: err })
      toast.error(err.response?.data?.detail || 'Failed to remove restriction')
    }
  }

  const getRestrictionDisplayName = (type: RestrictionType) => {
    return type === 'post_no_debit' ? 'Post No Debit' : 'Online Banking'
  }

  const getRestrictionIcon = (type: RestrictionType) => {
    return type === 'post_no_debit' ? Ban : Lock
  }

  const getRestrictionColor = (type: RestrictionType) => {
    return type === 'post_no_debit' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-red-100 text-red-800 border-red-200'
  }

  useEffect(() => {
    if (userId) {
      fetchRestrictions()
    }
  }, [userId])

  const activeRestrictions = restrictions.filter(r => r.is_active)
  const hasPostNoDebit = activeRestrictions.some(r => r.restriction_type === 'post_no_debit')
  const hasOnlineBanking = activeRestrictions.some(r => r.restriction_type === 'online_banking')

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Account Restrictions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Loading restrictions...
          </div>
        ) : activeRestrictions.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No active restrictions for {userName}
          </div>
        ) : (
          <div className="space-y-3">
            {hasPostNoDebit && (
              <div className={`p-3 rounded-lg border ${getRestrictionColor('post_no_debit')}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {React.createElement(getRestrictionIcon('post_no_debit'), { className: 'h-4 w-4' })}
                    <div>
                      <div className="font-medium">Post No Debit (PND)</div>
                      <div className="text-sm opacity-75">
                        User cannot withdraw, transfer, or make payments. Deposits allowed.
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRestriction('post_no_debit')}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                </div>
                {restrictions.find(r => r.restriction_type === 'post_no_debit')?.message && (
                  <div className="mt-2 p-2 bg-black/5 rounded text-sm">
                    <strong>Message to user:</strong> {restrictions.find(r => r.restriction_type === 'post_no_debit')?.message}
                  </div>
                )}
              </div>
            )}

            {hasOnlineBanking && (
              <div className={`p-3 rounded-lg border ${getRestrictionColor('online_banking')}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {React.createElement(getRestrictionIcon('online_banking'), { className: 'h-4 w-4' })}
                    <div>
                      <div className="font-medium">Online Banking Restriction</div>
                      <div className="text-sm opacity-75">
                        User cannot access online banking. Login blocked.
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRestriction('online_banking')}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                </div>
                {restrictions.find(r => r.restriction_type === 'online_banking')?.message && (
                  <div className="mt-2 p-2 bg-black/5 rounded text-sm">
                    <strong>Message to user:</strong> {restrictions.find(r => r.restriction_type === 'online_banking')?.message}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
