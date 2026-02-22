import { formatDate } from "@/lib/utils"
import { Globe, MapPin, CheckCircle2, XCircle } from 'lucide-react'

interface Activity {
  device_name?: string
  city?: string
  country?: string
  ip_address?: string
  status?: string
  login_successful?: boolean
  created_at: string
}

export function ActivityList({ items }: { items: Activity[] }) {
  if (!items?.length) {
    return (
      <div className="text-center py-8 border border-dashed rounded-xl">
        <p className="text-muted-foreground text-sm">No recent login activity found</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((activity, idx) => {
        // Robust success check matching backend strings or boolean
        const isSuccess =
          activity.status === 'successful' ||
          activity.status === 'success' ||
          activity.status === 'Successful' ||
          activity.login_successful === true;

        return (
          <div key={idx} className="p-4 border border-border rounded-xl bg-white hover:bg-gray-50 transition-colors shadow-sm group">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 break-words leading-tight">
                    {activity.device_name || 'System Login'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                      {activity.ip_address || '—'}
                    </span>
                    <span className="text-gray-300 text-xs hidden sm:inline">•</span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        {activity.city && activity.country ? `${activity.city}, ${activity.country}` : 'Unknown Location'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wider font-medium">
                    {formatDate(activity.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {isSuccess ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-semibold border border-green-100 whitespace-nowrap">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Successful
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-semibold border border-red-100 whitespace-nowrap">
                    <XCircle className="w-3.5 h-3.5" />
                    Failed
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )
}
