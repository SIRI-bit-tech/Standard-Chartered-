import { MessageCircle, PlusCircle, HelpCircle, Phone } from 'lucide-react'
import { colors } from '@/types'

export type SupportSection = 'chat' | 'ticket' | 'faq' | 'contact'

interface Action {
  key: SupportSection
  label: string
  subtitle: string
  icon: SupportSection
  active?: boolean
}

const ICONS = {
  chat: MessageCircle,
  ticket: PlusCircle,
  faq: HelpCircle,
  contact: Phone,
}

export function QuickActions({ items, onSelect }: { items: Action[]; onSelect: (key: SupportSection) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => {
        const Icon = ICONS[it.icon]
        return (
          <button
            key={it.key}
            onClick={() => onSelect(it.key)}
            className={
              'rounded-xl border p-4 transition ' +
              (it.active ? 'bg-primary/5 border-primary' : 'bg-white hover:bg-muted')
            }
            style={{ borderColor: it.active ? colors.primary : colors.border }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: it.active ? colors.primary : colors.primaryLight,
                  color: it.active ? colors.white : colors.primary,
                }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">{it.label}</div>
                <div className="text-xs text-muted-foreground">{it.subtitle}</div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
