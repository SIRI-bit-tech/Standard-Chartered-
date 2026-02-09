'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { colors } from '@/types'

export function NeedHelpCard() {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: colors.gray50,
        borderColor: colors.border,
      }}
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.gray600 }}>
        Need help?
      </p>
      <p className="mb-3 text-sm" style={{ color: colors.textSecondary }}>
        Our support team is available 24/7 for premium members.
      </p>
      <Button asChild size="sm" className="w-full">
        <Link href="/dashboard/support">Contact Agent</Link>
      </Button>
    </div>
  )
}
