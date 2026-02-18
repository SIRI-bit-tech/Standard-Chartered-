import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { colors } from '@/types'

type Priority = 'low' | 'medium' | 'high' | 'urgent'

export function CreateTicketForm({ onCreated }: { onCreated: () => void }) {
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('Login & Security')
  const [priority, setPriority] = useState<Priority>('medium')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const categories = [
    'Login & Security',
    'Transfers & Payments',
    'Cards & Disputes',
    'Accounts & Statements',
    'Profile & Settings',
    'Technical Issue/Bug',
  ]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject || !description) {
      setError('Subject and description are required')
      return
    }
    setBusy(true)
    setError(null)
    setOk(false)
    try {
      const payload = { subject, category, priority, description }
      const res = await apiClient.post<{ success: boolean }>('/api/v1/support/tickets', payload)
      if ((res as any)?.success === true) {
        setOk(true)
        setSubject('')
        setDescription('')
        setPriority('medium')
        onCreated()
      } else {
        setError('Failed to create ticket')
      }
    } catch {
      setError('Failed to create ticket')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border bg-white p-4 space-y-3" style={{ borderColor: colors.border }}>
      <div className="text-sm font-semibold">Create Ticket</div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {ok && <div className="text-sm text-green-700">Ticket created</div>}
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Describe the issue briefly"
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border rounded bg-white"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full px-3 py-2 border rounded bg-white"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border rounded min-h-[120px]"
          placeholder="Provide details so our team can assist quickly"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded text-white"
          style={{ backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }}
        >
          {busy ? 'Submitting…' : 'Submit Ticket'}
        </button>
      </div>
    </form>
  )
}
