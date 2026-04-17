'use client'

import React, { useState } from 'react'
import { useUserRestrictions } from '@/hooks/use-user-restrictions'
import { UserRestrictionModal } from './user-restriction-modal'
import type { RestrictionType } from '@/hooks/use-user-restrictions'

interface RestrictionGuardProps {
  children: React.ReactNode
  restrictionType: RestrictionType
  userId?: string
  fallback?: React.ReactNode
  onRestricted?: (restriction: any) => void
}

export function RestrictionGuard({ 
  children, 
  restrictionType, 
  userId, 
  fallback,
  onRestricted 
}: Readonly<RestrictionGuardProps>) {
  const { checkRestriction, getActiveRestriction } = useUserRestrictions(userId)
  const [showModal, setShowModal] = useState(false)

  const isRestricted = checkRestriction(restrictionType)
  const activeRestriction = getActiveRestriction(restrictionType)

  const handleRestrictedAction = (e?: React.MouseEvent) => {
    if (isRestricted && activeRestriction) {
      e?.preventDefault()
      e?.stopPropagation()
      onRestricted?.(activeRestriction)
      setShowModal(true)
    }
  }

  if (isRestricted && fallback) {
    return <>{fallback}</>
  }

  return (
    <div 
      onClickCapture={isRestricted ? handleRestrictedAction : undefined}
      className="contents"
    >
      {children}
      <UserRestrictionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        restriction={activeRestriction}
      />
    </div>
  )
}

// Hook for easier usage
export function useRestrictionGuard(restrictionType: RestrictionType, userId?: string) {
  const { checkRestriction, getActiveRestriction } = useUserRestrictions(userId)
  const [showModal, setShowModal] = useState(false)

  const isRestricted = checkRestriction(restrictionType)
  const activeRestriction = getActiveRestriction(restrictionType)

  const triggerRestricted = () => {
    if (isRestricted && activeRestriction) {
      setShowModal(true)
      return true
    }
    return false
  }

  const RestrictedModal = () => (
    <UserRestrictionModal
      open={showModal}
      onClose={() => setShowModal(false)}
      restriction={activeRestriction}
    />
  )

  return {
    isRestricted,
    activeRestriction,
    triggerRestricted,
    RestrictedModal
  }
}
