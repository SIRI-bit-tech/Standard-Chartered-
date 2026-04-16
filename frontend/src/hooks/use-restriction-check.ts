'use client'

import { useCallback } from 'react'
import { useUserRestrictionsContext } from '@/contexts/user-restrictions-context'
import type { RestrictionType } from '@/hooks/use-user-restrictions'

export function useRestrictionCheck() {
  const {
    hasPostNoDebit,
    hasOnlineBankingRestriction,
    postNoDebitRestriction,
    onlineBankingRestriction,
    showRestrictionModal,
    checkRestriction,
    getActiveRestriction
  } = useUserRestrictionsContext()

  const checkAndShowModal = useCallback((type: RestrictionType): boolean => {
    if (checkRestriction(type)) {
      showRestrictionModal(type)
      return true // Action is blocked
    }
    return false // Action can proceed
  }, [checkRestriction, showRestrictionModal])

  const checkPostNoDebit = useCallback((): boolean => {
    return checkAndShowModal('post_no_debit')
  }, [checkAndShowModal])

  const checkOnlineBanking = useCallback((): boolean => {
    return checkAndShowModal('online_banking')
  }, [checkAndShowModal])

  return {
    // State
    hasPostNoDebit,
    hasOnlineBankingRestriction,
    postNoDebitRestriction,
    onlineBankingRestriction,

    // Methods
    checkRestriction,
    getActiveRestriction,
    showRestrictionModal,

    // Convenience methods for common checks
    checkAndShowModal,
    checkPostNoDebit,
    checkOnlineBanking
  }
}
