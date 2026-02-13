'use client'

import { colors } from '@/types'
import type { AdminActivityItem, AdminSystemAlert } from '@/types'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Server, KeyRound, FileCode } from 'lucide-react'

export function AdminActivityFeed({ items }: { items: AdminActivityItem[] }) {
  return (
    <div className="rounded-xl border bg-white p-5" style={{ borderColor: colors.border }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
            Recent Activity Feed
          </h3>
        </div>
        <a className="text-xs font-medium" style={{ color: colors.primary }} href="#">
          View All Logs
        </a>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border" style={{ borderColor: colors.border }}>
        <div className="grid grid-cols-4 gap-2 border-b px-3 py-2 text-[11px] font-semibold uppercase" style={{ borderColor: colors.border, color: colors.textSecondary }}>
          <div>Event</div>
          <div>Actor</div>
          <div>Time</div>
          <div>Status</div>
        </div>
        <div>
          {items.map((it) => (
            <div key={it.id} className="grid grid-cols-4 gap-2 border-b px-3 py-3 text-sm" style={{ borderColor: colors.border }}>
              <div style={{ color: colors.textPrimary }}>{it.event}</div>
              <div style={{ color: colors.textSecondary }}>{it.actor}</div>
              <div style={{ color: colors.textSecondary }}>{it.time}</div>
              <div>
                <Badge
                  variant="outline"
                  className="border-0"
                  style={{
                    backgroundColor:
                      it.status === 'verified'
                        ? `${colors.success}20`
                        : it.status === 'flagged'
                          ? `${colors.error}20`
                          : `${colors.primary}15`,
                    color:
                      it.status === 'verified'
                        ? colors.success
                        : it.status === 'flagged'
                          ? colors.error
                          : colors.primary,
                  }}
                >
                  {it.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function alertIcon(title: string) {
  if (title.toLowerCase().includes('latency')) return <Server className="h-5 w-5" style={{ color: colors.error }} />
  if (title.toLowerCase().includes('credential')) return <KeyRound className="h-5 w-5" style={{ color: colors.warning }} />
  if (title.toLowerCase().includes('patch')) return <FileCode className="h-5 w-5" style={{ color: colors.primary }} />
  return <AlertTriangle className="h-5 w-5" style={{ color: colors.warning }} />
}

export function AdminSystemAlerts({ items }: { items: AdminSystemAlert[] }) {
  return (
    <div className="rounded-xl border bg-white p-5" style={{ borderColor: colors.border }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
            System Health & Alerts
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: colors.textSecondary }}>
            Real-time
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: colors.textSecondary }}>
          <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: colors.success }} />
          Online
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((a) => {
          const tone =
            a.severity === 'critical' ? colors.error : a.severity === 'warning' ? colors.warning : colors.primary
          const bg =
            a.severity === 'critical' ? `${colors.error}10` : a.severity === 'warning' ? `${colors.warning}10` : `${colors.primary}10`
          return (
            <div key={a.id} className="rounded-xl border p-4" style={{ borderColor: `${tone}40`, backgroundColor: bg }}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{alertIcon(a.title)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                      {a.title}
                    </p>
                    <Badge
                      className="border-0"
                      variant="outline"
                      style={{ backgroundColor: `${tone}20`, color: tone }}
                    >
                      {a.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
                    {a.message}
                  </p>
                  {a.cta && (
                    <button className="mt-3 text-xs font-semibold uppercase" style={{ color: tone }}>
                      {a.cta.label}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

