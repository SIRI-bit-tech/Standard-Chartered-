// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export const API_VERSION = 'v1'
export const API_ENDPOINTS = {
  // Auth
  AUTH_REGISTER: '/api/v1/auth/register',
  AUTH_LOGIN: '/api/v1/auth/login',
  AUTH_LOGOUT: '/api/v1/auth/logout',
  AUTH_SESSION: '/api/v1/auth/session',

  // Accounts
  ACCOUNTS: '/api/v1/accounts',
  ACCOUNT_DETAIL: '/api/v1/accounts/:id',
  ACCOUNT_BALANCE: '/api/v1/accounts/:id/balance',
  ACCOUNT_TRANSACTIONS: '/api/v1/accounts/:id/transactions',
  ACCOUNT_STATEMENTS: '/api/v1/accounts/:id/statements',

  // Transfers
  TRANSFERS: '/api/v1/transfers',
  TRANSFER_INTERNAL: '/api/v1/transfers/internal',
  TRANSFER_DOMESTIC: '/api/v1/transfers/domestic',
  TRANSFER_INTERNATIONAL: '/api/v1/transfers/international',
  BENEFICIARIES: '/api/v1/transfers/beneficiaries',

  // Loans
  LOAN_PRODUCTS: '/api/v1/loans/products',
  LOAN_APPLICATIONS: '/api/v1/loans/applications',
  LOAN_ACCOUNTS: '/api/v1/loans/accounts',

  // Notifications
  NOTIFICATIONS: '/api/v1/notifications',
  NOTIFICATION_SETTINGS: '/api/v1/notifications/settings',

  // Profile
  PROFILE: '/api/v1/profile',
  PROFILE_SETTINGS: '/api/v1/profile/settings',
  PROFILE_DOCUMENTS: '/api/v1/profile/documents',
  LOGIN_HISTORY: '/api/v1/profile/login-history',

  // Support
  SUPPORT_TICKETS: '/api/v1/support/tickets',
  SUPPORT_CHAT: '/api/v1/support/chat',

  // Bills
  BILL_PAYEES: '/api/v1/bills/payees',
  BILL_PAY: '/api/v1/bills/pay',
}

// Currency mapping by country
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: 'USD',
  UK: 'GBP',
  EU: 'EUR',
  KW: 'KWD',
  AE: 'AED',
  SG: 'SGD',
  HK: 'HKD',
  IN: 'INR',
  NG: 'NGN',
  ZA: 'ZAR',
  KE: 'KES',
  CA: 'CAD',
  AU: 'AUD',
  JP: 'JPY',
  CN: 'CNY',
  CH: 'CHF',
  SG: 'SGD',
}

// Account types
export const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking Account' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'crypto', label: 'Crypto Account' },
]

// Transaction types
export const TRANSACTION_TYPES = {
  DEBIT: 'debit',
  CREDIT: 'credit',
  TRANSFER: 'transfer',
  PAYMENT: 'payment',
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  INTEREST: 'interest',
  FEE: 'fee',
}

// Transfer types
export const TRANSFER_TYPES = {
  INTERNAL: 'internal',
  DOMESTIC: 'domestic',
  INTERNATIONAL: 'international',
  ACH: 'ach',
  WIRE: 'wire',
}

// Transfer fees
export const TRANSFER_FEES = {
  INTERNAL: 0,
  DOMESTIC: 2.5,
  INTERNATIONAL: 25,
  ACH: 0,
  WIRE: 15,
}

// User tiers
export const USER_TIERS = {
  STANDARD: 'standard',
  PRIORITY: 'priority',
  PREMIUM: 'premium',
}

// Authentication provider
export const AUTH_PROVIDER = (process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'better-auth') as 'better-auth' | 'clerk'



// Cloudinary configuration
export const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ''

// Notification types
export const NOTIFICATION_TYPES = {
  TRANSACTION: 'transaction',
  SECURITY: 'security',
  SYSTEM: 'system',
  LOAN: 'loan',
  ALERT: 'alert',
  OFFER: 'offer',
}

// Date formatting
export const DATE_FORMAT = 'MMM dd, yyyy'
export const DATETIME_FORMAT = 'MMM dd, yyyy hh:mm a'
export const TIME_FORMAT = 'hh:mm a'

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_LIMIT = 20

// Session timeout (in minutes)
export const SESSION_TIMEOUT = 15

// Countries list
export const COUNTRIES = [
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'UK', name: 'United Kingdom', currency: 'GBP' },
  { code: 'EU', name: 'European Union', currency: 'EUR' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'CN', name: 'China', currency: 'CNY' },
]
