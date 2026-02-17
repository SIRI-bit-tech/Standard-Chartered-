interface DeviceItem {
  device_name?: string
  device_type?: string
  ip_address?: string
  country?: string
  city?: string
  created_at: string
}

export function DevicesPanel({ items }: { items: DeviceItem[] }) {
  if (!items?.length) {
    return <p className="text-muted-foreground">No devices on record</p>
  }
  return (
    <div className="space-y-2">
      {items.map((d, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border p-3" >
          <div>
            <p className="text-sm font-medium">
              {d.device_name || 'Unknown Device'} • {d.device_type || 'Unknown'}
            </p>
            <p className="text-xs text-muted-foreground">
              {d.ip_address || '—'} • {d.city || '—'}, {d.country || '—'}
            </p>
          </div>
          <span className="text-xs text-success">Active</span>
        </div>
      ))}
    </div>
  )
}
