'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import type { SupportTicket, FaqItem, BranchOffice } from '@/types'
import { QuickActions, type SupportSection } from '@/components/support/QuickActions'
import { TicketTable } from '@/components/support/TicketTable'
import { CreateTicketForm } from '@/components/support/CreateTicketForm'
import { FAQSearch } from '@/components/support/FAQSearch'
import { ContactInfo } from '@/components/support/ContactInfo'
import { ChatWidget } from '@/components/support/ChatWidget'

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<SupportSection>('chat')
  const { user } = useAuthStore()

  useEffect(() => {
    load()
  }, [user])

  const load = async () => {
    if (!user) return
    try {
      const res = await apiClient.get<{ success: boolean; data: SupportTicket[] }>(`/api/v1/support/tickets?limit=5`)
      if (res?.success) setTickets(res.data)
    } finally {
      setLoading(false)
    }
  }

  const actions = [
    { key: 'chat' as const, label: 'Live Chat', subtitle: 'Agent online', icon: 'chat', active: active === 'chat' },
    { key: 'ticket' as const, label: 'Create Ticket', subtitle: 'Request help', icon: 'ticket', active: active === 'ticket' },
    { key: 'faq' as const, label: 'FAQs', subtitle: 'Search topics', icon: 'faq', active: active === 'faq' },
    { key: 'contact' as const, label: 'Contact Info', subtitle: 'Call local branch', icon: 'contact', active: active === 'contact' },
  ] as const

  const faqs: FaqItem[] = [
    { id: 'f1', question: 'How do I reset my password?', answer: 'Use “Forgot Password” on the login page and follow the email instructions.', category: 'Security', tags: ['password', 'login'] },
    { id: 'f2', question: 'What are transfer fees?', answer: 'Internal transfers are free; domestic $2.50; international $25.', category: 'Transfers', tags: ['fees', 'transfers'] },
    { id: 'f3', question: 'How long do transfers take?', answer: 'Internal instant; domestic 1–2 business days; international 3–5 business days.', category: 'Transfers' },
    { id: 'f4', question: 'How do I enable two‑factor authentication (2FA)?', answer: 'Go to Profile → Security and select Enable 2FA. Scan the QR code with an authenticator app and confirm with a 6‑digit code.', category: 'Security', tags: ['2fa', 'security'] },
    { id: 'f5', question: 'How do I dispute a card transaction?', answer: 'Freeze the card if needed, then contact Support via Live Chat or Create Ticket → Transaction dispute. Include date, amount and last 4 digits.', category: 'Cards', tags: ['dispute', 'card'] },
    { id: 'f6', question: 'Where can I download account statements?', answer: 'Open Accounts, select an account, then Statements to download monthly PDFs.', category: 'Accounts', tags: ['statements'] },
    { id: 'f7', question: 'What are daily transfer limits?', answer: 'Limits vary by account and verification status. You can see your limit on the transfer review screen; contact Support to request a change.', category: 'Transfers', tags: ['limits'] },
    { id: 'f8', question: 'How do I update my address or phone number?', answer: 'Go to Profile → Personal Info and edit your details. Changes save immediately.', category: 'Profile', tags: ['profile'] },
    { id: 'f9', question: 'Why was my international transfer delayed?', answer: 'International transfers can take 3–5 business days due to correspondent banks and compliance checks. We will notify you if additional documents are required.', category: 'Transfers', tags: ['international', 'delay'] },
    { id: 'f10', question: 'What exchange rate do you use for international transfers?', answer: 'Rates are sourced from our treasury and shown on the transfer review screen before you confirm.', category: 'Transfers', tags: ['fx', 'exchange'] },
    { id: 'f11', question: 'How do I report a lost or stolen card?', answer: 'Freeze your card immediately in Cards, then contact Support to arrange a replacement.', category: 'Cards', tags: ['lost', 'stolen'] },
    { id: 'f12', question: 'Can I schedule transfers and bill payments?', answer: 'Yes. On the transfer or bill payment form, set a future date or repeat frequency before confirming.', category: 'Payments', tags: ['schedule'] },
    { id: 'f13', question: 'How do I cancel a scheduled transfer or bill payment?', answer: 'Open Transfers or Bills → Scheduled, select the item and choose Cancel before the cutoff time.', category: 'Payments', tags: ['scheduled', 'cancel'] },
    { id: 'f14', question: 'What are the daily cut‑off times for transfers?', answer: 'Domestic transfers submitted after 5:00 PM local time process the next business day. International transfers after 3:00 PM GMT process the next business day.', category: 'Transfers', tags: ['cutoff'] },
    { id: 'f15', question: 'How do I set or change my transfer PIN?', answer: 'Go to Security → Transfer PIN and follow the prompts to set or update your PIN.', category: 'Security', tags: ['pin'] },
    { id: 'f16', question: 'How do I activate a new card?', answer: 'Open Cards and select the new card, then choose Activate and follow the on‑screen steps.', category: 'Cards', tags: ['activate'] },
    { id: 'f17', question: 'Why was my login session ended?', answer: 'For security, sessions expire after a period of inactivity. Log in again and consider enabling 2FA and trusted devices.', category: 'Security', tags: ['session'] },
    { id: 'f18', question: 'Can I change or remove a saved beneficiary?', answer: 'Yes. During transfer, choose Manage beneficiaries to edit or remove saved recipients.', category: 'Transfers', tags: ['beneficiary'] },
    { id: 'f19', question: 'How do I update notification preferences?', answer: 'Go to Profile → Notifications to enable or disable email/SMS alerts for transfers, logins and statements.', category: 'Profile', tags: ['notifications'] },
    { id: 'f20', question: 'What are support hours and response times?', answer: 'Live Chat and tickets are monitored 24/7. Most tickets receive a first response within 24 hours.', category: 'Support', tags: ['support'] },
  ]

  const branches: BranchOffice[] = [
    { id: 'b1', country: 'United Kingdom', city: 'London', address: '1 Basinghall Ave, London', phone: '+44 20 1234 0000', hours: 'Mon–Fri 9am–5pm' },
    { id: 'b2', country: 'Singapore', city: 'Singapore', address: '6 Battery Rd, Singapore', phone: '+65 6225 0000', hours: 'Mon–Fri 9am–5pm' },
    { id: 'b3', country: 'UAE', city: 'Dubai', address: 'DIFC, Dubai', phone: '+971 4 000 0000', hours: 'Sun–Thu 9am–5pm' },
    { id: 'b4', country: 'USA', city: 'New York', address: '1095 6th Ave, New York', phone: '+1 212 000 0000', hours: 'Mon–Fri 9am–5pm' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Support & Help Center</h1>
        <p className="text-muted-foreground">How can we help you today?</p>
      </div>
      <QuickActions items={actions as any} onSelect={setActive} />
      {active === 'chat' && <ChatOnly />}
      {active === 'ticket' && (
        <div className="space-y-4">
          <CreateTicketForm onCreated={load} />
          <TicketTable items={loading ? [] : tickets} />
          {loading && <div className="text-center py-8 text-sm text-muted-foreground">Loading tickets…</div>}
        </div>
      )}
      {active === 'faq' && (
        <div id="faqs" className="space-y-2">
          <h2 className="text-xl font-semibold">FAQs</h2>
          <FAQSearch items={faqs} />
        </div>
      )}
      {active === 'contact' && (
        <div id="contact" className="space-y-2">
          <h2 className="text-xl font-semibold">Contact & Branches</h2>
          <ContactInfo branches={branches} />
        </div>
      )}
    </div>
  )
}

function ChatOnly() {
  const openChat = () => {
    try {
      const api: any = (window as any).Tawk_API
      if (api && typeof api.maximize === 'function') {
        api.maximize()
      } else {
        // Retry shortly if the script is still initializing
        setTimeout(() => {
          try {
            const api2: any = (window as any).Tawk_API
            if (api2 && typeof api2.maximize === 'function') api2.maximize()
          } catch {}
        }, 800)
      }
    } catch {}
  }

  return (
    <div className="rounded-xl border bg-white p-8 flex flex-col items-center justify-center gap-3">
      <div className="text-lg font-semibold">Live Chat</div>
      <div className="text-sm text-muted-foreground text-center max-w-prose">
        Use the chat bubble at the bottom-right to talk to our team. If you don’t see it, click “Open Chat”.
      </div>
      <button
        onClick={openChat}
        className="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
      >
        Open Chat
      </button>
      <ChatWidget />
    </div>
  )
}
