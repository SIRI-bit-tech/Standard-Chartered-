import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistance } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency amount
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

// Format date
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy')
}

// Format date and time
export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy hh:mm a')
}

// Format time
export function formatTime(date: string | Date): string {
  return format(new Date(date), 'hh:mm a')
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(date: string | Date): string {
  return formatDistance(new Date(date), new Date(), { addSuffix: true })
}

// Format account number (mask for display)
export function formatAccountNumber(accountNumber: string): string {
  if (!accountNumber) return ''
  const visible = accountNumber.slice(-4)
  return `****${visible}`
}

// Format phone number
export function formatPhone(phone: string): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Generate random ID
export function generateId(prefix: string = ''): string {
  return `${prefix}${Math.random().toString(36).substr(2, 9)}`
}

// Get transaction icon
export function getTransactionIcon(type: string): string {
  const iconMap: Record<string, string> = {
    debit: '⬇️',
    credit: '⬆️',
    transfer: '↔️',
    payment: '💳',
    deposit: '💰',
    withdrawal: '🏧',
    interest: '📈',
    fee: '🔒',
  }
  return iconMap[type] || '💸'
}

// Get transaction color
export function getTransactionColor(type: string): string {
  const colorMap: Record<string, string> = {
    debit: 'text-error',
    credit: 'text-success',
    transfer: 'text-primary',
    payment: 'text-primary',
    deposit: 'text-success',
    withdrawal: 'text-error',
    interest: 'text-success',
    fee: 'text-warning',
  }
  return colorMap[type] || 'text-muted-foreground'
}

// Get status badge color
export function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    active: 'bg-success/10 text-success',
    completed: 'bg-success/10 text-success',
    pending: 'bg-warning/10 text-warning',
    processing: 'bg-primary/10 text-primary',
    failed: 'bg-error/10 text-error',
    cancelled: 'bg-muted-foreground/10 text-muted-foreground',
    rejected: 'bg-error/10 text-error',
    closed: 'bg-muted-foreground/10 text-muted-foreground',
    approved: 'bg-success/10 text-success',
    under_review: 'bg-primary/10 text-primary',
  }
  return statusMap[status] || 'bg-border text-muted-foreground'
}

// Truncate text
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Capitalize first letter
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Convert to title case
export function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split('_')
    .map((word) => capitalize(word))
    .join(' ')
}

// Get initials from name
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

// Calculate percentage
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}
