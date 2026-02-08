'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import { formatDate } from '@/lib/utils'

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState('tickets')
  const [tickets, setTickets] = useState<any[]>([])
  const [chats, setChats] = useState<any[]>([])
  const [selectedChat, setSelectedChat] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTicket, setShowCreateTicket] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'medium',
  })
  const [messageInput, setMessageInput] = useState('')
  const { user } = useAuthStore()

  useEffect(() => {
    loadSupportData()
  }, [user])

  const loadSupportData = async () => {
    if (!user) return

    try {
      // Load tickets
      const ticketsResponse = await apiClient.get<{ success: boolean; data: any[] }>(`/api/v1/support/tickets?user_id=${user.id}&limit=10`)
      if (ticketsResponse.success) {
        setTickets(ticketsResponse.data)
      }

      // Load chats
      const chatsResponse = await apiClient.get<{ success: boolean; data: any[] }>(`/api/v1/support/chats?user_id=${user.id}`)
      if (chatsResponse.success) {
        setChats(chatsResponse.data)
      }
    } catch (error) {
      console.error('Failed to load support data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const response = await apiClient.post<{ success: boolean; data: any }>('/api/v1/support/ticket', {
        user_id: user.id,
        ...ticketForm,
      })

      if (response.success) {
        alert('Support ticket created successfully!')
        setTicketForm({ subject: '', description: '', category: 'general', priority: 'medium' })
        setShowCreateTicket(false)
        await loadSupportData()
      }
    } catch (error) {
      console.error('Failed to create ticket:', error)
      alert('Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleStartChat = async () => {
    if (!user) return

    try {
      const response = await apiClient.post<{ success: boolean; data: any }>('/api/v1/support/chat/start', {
        user_id: user.id,
      })

      if (response.success) {
        await loadSupportData()
      }
    } catch (error) {
      console.error('Failed to start chat:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChat || !messageInput.trim() || !user) return

    try {
      const response = await apiClient.post<{ success: boolean; data: any }>(
        `/api/v1/support/chat/${selectedChat.id}/message`,
        {
          user_id: user.id,
          message: messageInput,
        }
      )

      if (response.success) {
        setMessageInput('')
        // Reload chat messages
        const messagesResponse = await apiClient.get<{ success: boolean; data: any[] }>(
          `/api/v1/support/chat/${selectedChat.id}/messages`
        )
        if (messagesResponse.success) {
          setChatMessages(messagesResponse.data)
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Customer Support</h1>

      {/* Tabs */}
      <div className="bg-white border-b border-border rounded-t-xl">
        <div className="flex gap-8 px-6 py-4 flex-wrap">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`py-2 font-medium transition ${
              activeTab === 'tickets'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Support Tickets ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-2 font-medium transition ${
              activeTab === 'chat'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Live Chat ({chats.length})
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`py-2 font-medium transition ${
              activeTab === 'faq'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            FAQ
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading support data...</div>
      ) : (
        <>
          {/* Support Tickets */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              <button
                onClick={() => setShowCreateTicket(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
              >
                + Create Support Ticket
              </button>

              {showCreateTicket && (
                <div className="bg-white rounded-xl p-6 border border-border">
                  <h3 className="text-xl font-bold text-foreground mb-4">Create Support Ticket</h3>
                  <form onSubmit={handleCreateTicket} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        placeholder="Briefly describe your issue"
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Category
                      </label>
                      <select
                        value={ticketForm.category}
                        onChange={(e) =>
                          setTicketForm({ ...ticketForm, category: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                      >
                        <option value="general">General Inquiry</option>
                        <option value="technical">Technical Issue</option>
                        <option value="billing">Billing Question</option>
                        <option value="account">Account Issue</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Priority
                      </label>
                      <select
                        value={ticketForm.priority}
                        onChange={(e) =>
                          setTicketForm({ ...ticketForm, priority: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Description
                      </label>
                      <textarea
                        value={ticketForm.description}
                        onChange={(e) =>
                          setTicketForm({ ...ticketForm, description: e.target.value })
                        }
                        placeholder="Please describe your issue in detail"
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary resize-none"
                        rows={5}
                        required
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateTicket(false)}
                        className="flex-1 py-2 border border-border rounded-lg hover:bg-border transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                      >
                        Create Ticket
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {tickets.length > 0 ? (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="bg-white rounded-lg p-4 border border-border hover:shadow-md transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-foreground">{ticket.ticket_number}</p>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                ticket.status === 'open'
                                  ? 'bg-warning/10 text-warning'
                                  : ticket.status === 'resolved'
                                    ? 'bg-success/10 text-success'
                                    : 'bg-primary/10 text-primary'
                              }`}
                            >
                              {ticket.status}
                            </span>
                          </div>
                          <p className="text-foreground">{ticket.subject}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDate(ticket.created_at)}
                          </p>
                        </div>
                        <button className="px-3 py-1 border border-primary text-primary rounded text-sm hover:bg-primary/5 transition">
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl p-12 text-center border border-border">
                  <p className="text-muted-foreground">No support tickets yet</p>
                </div>
              )}
            </div>
          )}

          {/* Live Chat */}
          {activeTab === 'chat' && (
            <div className="space-y-6">
              <button
                onClick={handleStartChat}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
              >
                + Start New Chat
              </button>

              {chats.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl border border-border max-h-96 overflow-y-auto">
                    {chats.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => setSelectedChat(chat)}
                        className={`w-full text-left p-4 border-b border-border hover:bg-border-light transition ${
                          selectedChat?.id === chat.id ? 'bg-primary/5' : ''
                        }`}
                      >
                        <p className="font-medium text-foreground text-sm">Chat #{chat.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(chat.created_at)}</p>
                      </button>
                    ))}
                  </div>

                  <div className="lg:col-span-3 bg-white rounded-xl border border-border flex flex-col">
                    {selectedChat ? (
                      <>
                        <div className="p-4 border-b border-border">
                          <h3 className="font-semibold text-foreground">
                            Chat #{selectedChat.id.slice(0, 8)}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Status: {selectedChat.status}
                          </p>
                        </div>

                        <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-96">
                          {chatMessages.length > 0 ? (
                            chatMessages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex ${msg.is_from_agent ? 'justify-start' : 'justify-end'}`}
                              >
                                <div
                                  className={`max-w-xs p-3 rounded-lg ${
                                    msg.is_from_agent
                                      ? 'bg-border text-foreground'
                                      : 'bg-primary text-white'
                                  }`}
                                >
                                  <p className="text-sm">{msg.message}</p>
                                  <p className="text-xs opacity-70 mt-1">
                                    {formatDate(msg.created_at)}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-center text-muted-foreground text-sm">No messages yet</p>
                          )}
                        </div>

                        <form onSubmit={handleSendMessage} className="p-4 border-t border-border flex gap-2">
                          <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                          >
                            Send
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Select a chat to continue
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl p-12 text-center border border-border">
                  <p className="text-muted-foreground mb-4">No active chats</p>
                </div>
              )}
            </div>
          )}

          {/* FAQ */}
          {activeTab === 'faq' && (
            <div className="bg-white rounded-xl p-8 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>

              <div className="space-y-6">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="border-b border-border pb-6 last:border-b-0">
                    <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const faqs = [
  {
    q: 'How do I reset my password?',
    a: 'You can reset your password by clicking "Forgot Password" on the login page. Follow the instructions sent to your registered email address.',
  },
  {
    q: 'What are the transfer fees?',
    a: 'Transfer fees vary by type: Internal transfers are free, domestic transfers cost $2.50, and international transfers cost $25.',
  },
  {
    q: 'How long do transfers take?',
    a: 'Internal transfers are instant, domestic transfers typically take 1-2 business days, and international transfers take 3-5 business days.',
  },
  {
    q: 'Is my money safe?',
    a: 'Yes, we use 128-bit SSL encryption and bank-grade security measures to protect your funds and personal information.',
  },
  {
    q: 'Can I apply for a loan?',
    a: 'Yes, eligible customers can apply for various loan products through the Loans section of your dashboard.',
  },
]
