import type { ComponentType } from 'react'

// User types
export interface User {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  phone?: string
  country: string
  primary_currency: string
  tier: 'standard' | 'priority' | 'premium'
  email_verified: boolean
  phone_verified: boolean
  identity_verified: boolean
  created_at: string
  last_login?: string
}

// Account types
export interface Account {
  id: string
  account_number: string
  routing_number?: string // US accounts only
  type: 'checking' | 'savings' | 'crypto'
  currency: string
  balance: number
  available_balance: number
  status: 'active' | 'frozen' | 'closed' | 'pending'
  nickname?: string
  interest_rate: number
  is_primary: boolean
  overdraft_limit?: number
  created_at: string
}

// Transaction types
export interface Transaction {
  id: string
  account_id: string
  type: 'debit' | 'credit' | 'transfer' | 'payment' | 'deposit' | 'withdrawal' | 'interest' | 'fee'
  amount: number
  currency: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'reversed'
  created_at: string
  posted_date?: string
}

// Transfer types
export type TransferTypeTab = 'internal' | 'domestic' | 'international' | 'ach'

export interface Transfer {
  id: string
  type: 'internal' | 'domestic' | 'international' | 'ach' | 'wire'
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'rejected'
  reference_number: string
  created_at: string
  description?: string
}

/** Form state for internal transfer (own accounts) */
export interface InternalTransferForm {
  from_account_id: string
  to_account_id: string
  amount: number
  reference_memo: string
}

/** Form state for domestic wire / transfer to other local accounts */
export interface DomesticTransferForm {
  from_account_id: string
  recipient_name: string
  routing_number: string
  account_number: string
  physical_address: string
  amount: number
  memo: string
}

/** Form state for international wire (SWIFT) */
export interface InternationalTransferForm {
  from_account_id: string
  beneficiary_name: string
  swift_bic: string
  country: string
  iban_or_account: string
  bank_name: string
  amount: number
  purpose: string
}

/** Form state for ACH bank transfer */
export interface ACHTransferForm {
  from_account_id: string
  recipient_name: string
  account_type: 'checking' | 'savings'
  routing_number: string
  account_number: string
  amount: number
  schedule: 'now' | 'future'
}

/** Transfer summary shown in sidebar (real-time) */
export interface TransferSummaryState {
  amount: number
  fee: number
  totalToPay: number
  recipientReceives?: number
  exchangeRate?: string
  estimatedDelivery: string
  currency: string
}

/** Request payload when confirming transfer (includes PIN) */
export interface TransferConfirmPayload {
  transfer_pin: string
  [key: string]: unknown
}

// Beneficiary types
export interface Beneficiary {
  id: string
  name: string
  account_number: string
  transfer_type: string
  country?: string
  bank_name?: string
  swift_code?: string
}

// Loan types
export interface LoanProduct {
  id: string
  name: string
  type: string
  min_amount: number
  max_amount: number
  interest_rate: number
  min_term: number
  max_term: number
}

export interface LoanApplication {
  id: string
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
  requested_amount: number
  requested_term: number
  approved_amount?: number
  approved_interest_rate?: number
  monthly_payment?: number
  created_at: string
}

export interface Loan {
  id: string
  type: string
  principal_amount: number
  interest_rate: number
  remaining_balance: number
  monthly_payment: number
  payments_made: number
  next_payment_date: string
  status: string
}

// Notification types
export interface Notification {
  id: string
  title: string
  message: string
  type: 'transaction' | 'security' | 'system' | 'loan' | 'alert' | 'offer'
  status: 'unread' | 'read' | 'archived'
  created_at: string
}

// Document types
export interface Document {
  id: string
  type: 'id_document' | 'statement' | 'receipt' | 'tax_document' | 'loan_application'
  filename: string
  status: 'uploaded' | 'verified' | 'rejected' | 'expired'
  created_at: string
}

// Support types
export interface SupportTicket {
  id: string
  ticket_number: string
  subject: string
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
}

export interface ChatMessage {
  id: string
  chat_id: string
  sender_id: string
  message: string
  is_from_agent: boolean
  created_at: string
}

// Auth types
export interface AuthResponse {
  success: boolean
  data: Record<string, any>
  message: string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

// Dashboard UI types
export interface NavItem {
  href: string
  label: string
  icon: ComponentType<{ className?: string; size?: number }>
}

export interface QuickActionItem {
  href: string
  label: string
  description?: string
  icon: ComponentType<{ className?: string; size?: number }>
}

// Color theme variables
export const colors = {
  // Primary brand colors
  primary: '#0066CC',
  primaryDark: '#0052A3',
  primaryLight: '#E6F2FF',

  // Secondary colors
  secondary: '#2C3E50',
  accent: '#27AE60',

  // Neutral colors
  white: '#FFFFFF',
  gray50: '#F8F9FA',
  gray100: '#E9ECEF',
  gray200: '#DEE2E6',
  gray300: '#CED4DA',
  gray400: '#ADB5BD',
  gray500: '#6C757D',
  gray600: '#495057',
  gray700: '#343A40',
  gray800: '#212529',
  gray900: '#1A1A1A',
  black: '#000000',

  // Status colors
  success: '#27AE60',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#3498DB',

  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundDark: '#1A1A1A',

  // Text colors
  textPrimary: '#1A1A1A',
  textSecondary: '#6C757D',
  textLight: '#FFFFFF',

  // Border colors
  border: '#DEE2E6',
  borderLight: '#E9ECEF',
} as const
