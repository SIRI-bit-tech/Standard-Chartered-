'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/constants'
import { logger } from '@/lib/logger'

export type RestrictionType = 'post_no_debit' | 'online_banking'

export interface UserRestriction {
  id: string
  restriction_type: RestrictionType
  is_active: boolean
  message: string
  created_at: string
  created_by: string | null
}

export function useUserRestrictions(userId?: string) {
  const [restrictions, setRestrictions] = useState<UserRestriction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    const fetchRestrictions = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await apiClient.get<{
          data: {
            restrictions: UserRestriction[]
          }
        }>(API_ENDPOINTS.PROFILE_RESTRICTIONS)

        if (response.data?.restrictions) {
          setRestrictions(response.data.restrictions)
        }
      } catch (err) {
        logger.error('Failed to fetch user restrictions', err)
        setError('Failed to check account restrictions')
      } finally {
        setLoading(false)
      }
    }

    fetchRestrictions()
  }, [userId])

  const checkRestriction = (type: RestrictionType): boolean => {
    return restrictions.some(restriction =>
      restriction.restriction_type === type && restriction.is_active
    )
  }

  const getActiveRestriction = (type: RestrictionType): UserRestriction | null => {
    return restrictions.find(restriction =>
      restriction.restriction_type === type && restriction.is_active
    ) || null
  }

  const hasPostNoDebit = checkRestriction('post_no_debit')
  const hasOnlineBankingRestriction = checkRestriction('online_banking')
  const postNoDebitRestriction = getActiveRestriction('post_no_debit')
  const onlineBankingRestriction = getActiveRestriction('online_banking')

  return {
    restrictions,
    loading,
    error,
    checkRestriction,
    getActiveRestriction,
    hasPostNoDebit,
    hasOnlineBankingRestriction,
    postNoDebitRestriction,
    onlineBankingRestriction
  }
}
