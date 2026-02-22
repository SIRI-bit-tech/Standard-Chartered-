import { Monitor, Smartphone, Trash2, Clock, ShieldCheck } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { useState } from 'react'

interface Device {
  id: string
  device_id: string
  device_name: string
  ip_address: string
  user_agent: string
  last_seen: string
  active: boolean
}

export function DevicesPanel({ items }: { items: Device[] }) {
  const [deviceList, setDeviceList] = useState<Device[]>(items)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const handleRevoke = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke access for this device?')) return

    setRevokingId(deviceId)
    try {
      const res = await apiClient.delete<{ success: boolean }>(`/api/v1/security/devices/revoke?device_id=${deviceId}`)
      if (res.success) {
        setDeviceList(prev => prev.filter(d => d.device_id !== deviceId))
      }
    } catch (err) {
      console.error('Failed to revoke device:', err)
      alert('Failed to revoke device access')
    } finally {
      setRevokingId(null)
    }
  }

  const effectiveItems = deviceList.length > 0 ? deviceList : items

  if (!effectiveItems?.length) {
    return (
      <div className="text-center py-10 border border-dashed rounded-xl bg-gray-50/50">
        <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No trusted devices found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {effectiveItems.map((device) => (
        <div key={device.id} className="p-4 rounded-xl border border-border bg-white shadow-sm hover:border-primary/20 transition-all">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="mt-1 w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                {device.device_name?.includes('Android') || device.device_name?.includes('iPhone') ? (
                  <Smartphone className="w-5 h-5 text-primary" />
                ) : (
                  <Monitor className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">
                  {device.device_name || 'Unknown Device'}
                </h4>
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    {device.ip_address}
                  </span>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Last seen: {formatDate(device.last_seen)}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleRevoke(device.device_id)}
              disabled={revokingId === device.device_id}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
              title="Revoke Trust"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
