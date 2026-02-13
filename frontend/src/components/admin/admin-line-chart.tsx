'use client'

import { colors } from '@/types'
import type { AdminTimeSeriesPoint } from '@/types'

interface AdminLineChartProps {
  data: AdminTimeSeriesPoint[]
  height?: number
}

/**
 * Lightweight inline SVG line chart (no external deps).
 * Expects small datasets (e.g. 6-12 points).
 */
export function AdminLineChart({ data, height = 220 }: AdminLineChartProps) {
  const width = 640
  const padding = 18

  const values = data.map((d) => d.value)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = Math.max(max - min, 1)

  const points = data.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / Math.max(data.length - 1, 1)
    const y = padding + ((max - d.value) * (height - padding * 2)) / span
    return { x, y }
  })

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ')

  const areaPath = `${path} L ${points[points.length - 1]?.x ?? padding} ${height - padding} L ${padding} ${height - padding} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <defs>
        <linearGradient id="adminLineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.primary} stopOpacity="0.25" />
          <stop offset="100%" stopColor={colors.primary} stopOpacity="0.00" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#adminLineFill)" />
      <path d={path} fill="none" stroke={colors.primary} strokeWidth="3" strokeLinecap="round" />
      {points.map((p, idx) => (
        <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill={colors.white} stroke={colors.primary} strokeWidth="2" />
      ))}
    </svg>
  )
}

