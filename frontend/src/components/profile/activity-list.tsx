import { formatDate } from "@/lib/utils"

interface Activity {
  device_type?: string
  city?: string
  country?: string
  created_at: string
}

export function ActivityList({ items }: { items: Activity[] }) {
  if (!items?.length) {
    return <p className="text-muted-foreground">No login activity</p>
  }
  return (
    <div className="space-y-3">
      {items.map((activity, idx) => (
        <div key={idx} className="p-4 border border-border rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-foreground">
                {activity.device_type ? activity.device_type.charAt(0).toUpperCase() + activity.device_type.slice(1) : 'Unknown'} Login
              </p>
              <p className="text-sm text-muted-foreground">
                {activity.city && activity.country ? `${activity.city}, ${activity.country}` : 'Unknown Location'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(activity.created_at)}</p>
            </div>
            <span className="text-success text-sm">✓ Successful</span>
          </div>
        </div>
      ))}
    </div>
  )
}
