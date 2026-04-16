'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { useUserRestrictions, type UserRestriction, type RestrictionType } from '@/hooks/use-user-restrictions'
import { UserRestrictionModal } from '@/components/user/user-restriction-modal'

interface UserRestrictionsContextType {
  restrictions: UserRestriction[]
  hasPostNoDebit: boolean
  hasOnlineBankingRestriction: boolean
  postNoDebitRestriction: UserRestriction | null
  onlineBankingRestriction: UserRestriction | null
  checkRestriction: (type: RestrictionType) => boolean
  getActiveRestriction: (type: RestrictionType) => UserRestriction | null
  showRestrictionModal: (type: RestrictionType) => void
  loading: boolean
  error: string | null
}

const UserRestrictionsContext = createContext<UserRestrictionsContextType | undefined>(undefined)

export function useUserRestrictionsContext() {
  const context = useContext(UserRestrictionsContext)
  if (context === undefined) {
    throw new Error('useUserRestrictionsContext must be used within a UserRestrictionsProvider')
  }
  return context
}

interface UserRestrictionsProviderProps {
  children: ReactNode
  userId?: string
}

export function UserRestrictionsProvider({ children, userId }: UserRestrictionsProviderProps) {
  const {
    restrictions,
    hasPostNoDebit,
    hasOnlineBankingRestriction,
    postNoDebitRestriction,
    onlineBankingRestriction,
    checkRestriction,
    getActiveRestriction,
    loading,
    error
  } = useUserRestrictions(userId)

  const [modalState, setModalState] = useState<{
    open: boolean
    type: RestrictionType | null
    restriction: UserRestriction | null
  }>({
    open: false,
    type: null,
    restriction: null
  })

  const showRestrictionModal = (type: RestrictionType) => {
    const restriction = getActiveRestriction(type)
    if (restriction) {
      setModalState({
        open: true,
        type,
        restriction
      })
    }
  }

  const closeRestrictionModal = () => {
    setModalState({
      open: false,
      type: null,
      restriction: null
    })
  }

  const value: UserRestrictionsContextType = {
    restrictions,
    hasPostNoDebit,
    hasOnlineBankingRestriction,
    postNoDebitRestriction,
    onlineBankingRestriction,
    checkRestriction,
    getActiveRestriction,
    showRestrictionModal,
    loading,
    error
  }

  return (
    <UserRestrictionsContext.Provider value={value}>
      {children}
      {modalState.open && modalState.restriction && (
        <UserRestrictionModal
          open={modalState.open}
          onClose={closeRestrictionModal}
          restriction={modalState.restriction}
        />
      )}
    </UserRestrictionsContext.Provider>
  )
}
