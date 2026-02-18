 'use client'
 
import { useMemo, useState } from 'react'
import type { FaqItem } from '@/types'
import { colors } from '@/types'

export function FAQSearch({ items }: { items: FaqItem[] }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return items
    return items.filter((f) => {
      const hay = `${f.question} ${f.answer} ${f.category || ''} ${(f.tags || []).join(' ')}`.toLowerCase()
      return hay.includes(term)
    })
  }, [q, items])

  return (
    <div className="rounded-xl border bg-white p-4" style={{ borderColor: colors.border }}>
      <div className="flex items-center gap-3 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search topics"
          className="flex-1 px-3 py-2 border rounded"
        />
      </div>
      <div className="space-y-3">
        {filtered.map((f) => (
          <details key={f.id} className="rounded border px-4 py-3" style={{ borderColor: colors.borderLight }}>
            <summary className="font-medium cursor-pointer">{f.question}</summary>
            <div className="mt-2 text-sm text-muted-foreground">{f.answer}</div>
          </details>
        ))}
        {filtered.length === 0 && <div className="text-sm text-muted-foreground">No matching topics</div>}
      </div>
    </div>
  )
}
