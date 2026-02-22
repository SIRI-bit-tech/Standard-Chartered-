import { Monitor, Smartphone, Trash2, Clock, ShieldCheck, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { useState, useEffect } from 'react'

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
  const [revokingDevice, setRevokingDevice] = useState<Device | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Sync state with props if they change
  useEffect(() => {
    setDeviceList(items)
  }, [items])

  const handleRevoke = async () => {
    if (!revokingDevice) return

    setIsProcessing(true)
    try {
      const res = await apiClient.delete<{ success: boolean }>(`/api/v1/security/devices/revoke?device_id=${revokingDevice.device_id}`)
      if (res.success) {
        setDeviceList(prev => prev.filter(d => d.device_id !== revokingDevice.device_id))
        setRevokingDevice(null)
      }
    } catch (err) {
      console.error('Failed to revoke device:', err)
      alert('Failed to revoke device access')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!deviceList?.length) {
    return (
      <div className="text-center py-10 border border-dashed rounded-xl bg-gray-50/50">
        <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No trusted devices found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {deviceList.map((device) => (
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
              onClick={() => setRevokingDevice(device)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
              title="Revoke Trust"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Revoke Confirmation Modal */}
      {revokingDevice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Revoke Device Access?</h3>
              <p className="text-sm text-gray-500 mt-2">
                This device <span className="font-semibold">{revokingDevice.device_name}</span> will no longer be trusted and will require a fresh login.
              </p>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setRevokingDevice(null)}
                disabled={isProcessing}
                className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={isProcessing}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? 'Revoking...' : 'Yes, Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
