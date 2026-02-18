'use client'

import { useEffect, useMemo, useState } from 'react'
import { BrandLoader } from '@/components/ui/loading-overlay'

export default function Loading() {
  const [ms, setMs] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setMs((v) => v + 100), 100)
    return () => clearInterval(id)
  }, [])

  const pct = useMemo(() => {
    const p = (ms / 8000) * 100
    return p > 100 ? 100 : p
  }, [ms])

  const seconds = useMemo(() => (ms / 1000).toFixed(1), [ms])
  const slow = ms >= 8000

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="w-[min(520px,92vw)] text-center space-y-4">
        <div className="mx-auto w-28 h-28">
          <BrandLoader size={112} />
        </div>
        <div className="text-base font-medium text-[#1A1A1A]">
          Loading<span className="mx-1">•</span>{seconds}s
        </div>
        <div className="w-full h-2 rounded bg-[#E9ECEF] overflow-hidden">
          <div
            className="h-full bg-[#0066CC] transition-[width] duration-100 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        {slow && (
          <div className="text-xs text-[#6C757D]">
            This is taking longer than usual. Please keep this tab open.
          </div>
        )}
      </div>
    </div>
  )
}

