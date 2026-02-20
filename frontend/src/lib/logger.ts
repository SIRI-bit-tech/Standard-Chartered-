/**
 * Structured logging utility
 * Only logs in development environment, respects user preferences
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: unknown
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private logs: LogEntry[] = []
  private maxLogs = 100

  private formatTime(): string {
    return new Date().toISOString().split('T')[1].slice(0, 8)
  }

  private shouldLog(): boolean {
    if (typeof window === 'undefined') return false
    return this.isDevelopment
  }

  private addToHistory(entry: LogEntry) {
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  debug(message: string, data?: unknown) {
    if (!this.shouldLog()) return
    const entry: LogEntry = {
      level: 'debug',
      message,
      timestamp: this.formatTime(),
      data,
    }
    this.addToHistory(entry)
  }

  info(message: string, data?: unknown) {
    if (!this.shouldLog()) return
    const entry: LogEntry = {
      level: 'info',
      message,
      timestamp: this.formatTime(),
      data,
    }
    this.addToHistory(entry)
  }

  warn(message: string, data?: unknown) {
    if (!this.shouldLog()) return
    const entry: LogEntry = {
      level: 'warn',
      message,
      timestamp: this.formatTime(),
      data,
    }
    this.addToHistory(entry)
  }

  error(message: string, error?: unknown) {
    if (!this.shouldLog()) return
    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: this.formatTime(),
      data: error instanceof Error ? error.message : error,
    }
    this.addToHistory(entry)
  }

  getLogs(): LogEntry[] {
    return this.logs
  }

  clearLogs() {
    this.logs = []
  }
}

export const logger = new Logger()
