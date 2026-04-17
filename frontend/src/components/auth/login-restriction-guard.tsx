'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRestrictionCheck } from '@/hooks/use-restriction-check'
import { UserRestrictionModal } from '@/components/user/user-restriction-modal'

interface LoginRestrictionGuardProps {
  userId?: string
  onRestricted?: () => void
}

export function LoginRestrictionGuard({ userId, onRestricted }: LoginRestrictionGuardProps) {
  const { hasOnlineBankingRestriction, onlineBankingRestriction } = useRestrictionCheck()
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (userId && hasOnlineBankingRestriction) {
      // User has online banking restriction
      onRestricted?.()
      setShowModal(true)
      
      // Redirect to login page after showing modal
      setTimeout(() => {
        router.push('/auth/login')
      }, 3000)
    }
  }, [userId, hasOnlineBankingRestriction, onRestricted, router])

  const handleClose = () => {
    setShowModal(false)
    router.push('/auth/login')
  }

  if (!hasOnlineBankingRestriction || !onlineBankingRestriction) {
    return null
  }

  return (
    <UserRestrictionModal
      open={showModal}
      onClose={handleClose}
      restriction={onlineBankingRestriction}
    />
  )
}
