import { useState } from "react"
import { apiClient } from "@/lib/api-client"
import { Spinner } from "@/components/ui/spinner"
import { colors } from "@/types"

interface Props {
  onUploaded: (url: string) => void
}

export function ProfileAvatarUploader({ onUploaded }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: fd })
      const json = await res.json()
      if (!json?.success) throw new Error(json?.message || 'Upload failed')
      const url = json.data?.url
      if (!url) throw new Error('No URL returned')
      const saved = await apiClient.put<{ success: boolean; data: any }>(`/api/v1/profile/avatar`, { image_url: url } as any)
      if (saved.success) onUploaded(url)
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label className="inline-flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
        <span className="px-3 py-2 border rounded-lg text-sm cursor-pointer hover:bg-muted" style={{ borderColor: colors.border }}>
          Change Photo
        </span>
      </label>
      {busy && <Spinner className="text-primary" />}
      {error && <span className="text-destructive text-sm">{error}</span>}
    </div>
  )
}
