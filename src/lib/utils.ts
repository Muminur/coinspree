import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Date formatting utilities for the crypto application
 */
export class DateUtils {
  /**
   * Format a date to a readable string (e.g., "Jan 15, 2024")
   */
  static formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  /**
   * Format a date with time (e.g., "Jan 15, 2024 at 2:30 PM")
   */
  static formatDateTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  /**
   * Get relative time (e.g., "2 hours ago", "3 days ago")
   */
  static getRelativeTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'just now'
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
    }

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    }

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    }

    const diffInMonths = Math.floor(diffInDays / 30)
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`
    }

    const diffInYears = Math.floor(diffInMonths / 12)
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`
  }

  /**
   * Get ISO string for current time
   */
  static getCurrentISOString(): string {
    return new Date().toISOString()
  }

  /**
   * Add days to a date
   */
  static addDays(date: string | Date, days: number): Date {
    const d = typeof date === 'string' ? new Date(date) : new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }

  /**
   * Check if a date is in the past
   */
  static isInPast(date: string | Date): boolean {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.getTime() < new Date().getTime()
  }

  /**
   * Check if a subscription is expired
   */
  static isSubscriptionExpired(endDate: string | Date): boolean {
    return this.isInPast(endDate)
  }

  /**
   * Get days until expiration
   */
  static getDaysUntilExpiration(endDate: string | Date): number {
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate
    const now = new Date()
    const diffInMs = end.getTime() - now.getTime()
    return Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
  }
}

/**
 * Number formatting utilities for crypto prices and values
 */
export class NumberUtils {
  /**
   * Format price with appropriate decimals based on value
   */
  static formatPrice(price: number): string {
    if (!price || isNaN(price)) return '0.00'
    if (price >= 1000) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    } else if (price >= 1) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })
    } else {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      })
    }
  }

  /**
   * Format market cap with abbreviations (K, M, B, T)
   */
  static formatMarketCap(value: number): string {
    if (!value || isNaN(value)) return '$0.00'
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(2)}K`
    } else {
      return `$${value.toFixed(2)}`
    }
  }

  /**
   * Format percentage change with + or - sign
   */
  static formatPercentage(percentage: number): string {
    if (!percentage || isNaN(percentage)) return '0.00%'
    const sign = percentage >= 0 ? '+' : ''
    return `${sign}${percentage.toFixed(2)}%`
  }

  /**
   * Calculate percentage change between two values
   */
  static calculatePercentageChange(oldValue: number, newValue: number): number {
    if (!oldValue || !newValue || isNaN(oldValue) || isNaN(newValue) || oldValue === 0) return 0
    return ((newValue - oldValue) / oldValue) * 100
  }

  /**
   * Get price change class for styling (green for up, red for down)
   */
  static getPriceChangeClass(change: number): string {
    if (change > 0) return 'price-up'
    if (change < 0) return 'price-down'
    return 'price-neutral'
  }
}

/**
 * String utilities
 */
export class StringUtils {
  /**
   * Capitalize first letter of a string
   */
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  /**
   * Generate a random string for IDs
   */
  static generateId(length: number = 8): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Truncate text with ellipsis
   */
  static truncate(text: string, length: number): string {
    if (text.length <= length) return text
    return text.slice(0, length) + '...'
  }

  /**
   * Format email for display (hide part of the email)
   */
  static maskEmail(email: string): string {
    const [name, domain] = email.split('@')
    if (name.length <= 2) return email
    const maskedName =
      name.charAt(0) +
      '*'.repeat(name.length - 2) +
      name.charAt(name.length - 1)
    return `${maskedName}@${domain}`
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Check if email format is valid
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Check if password meets requirements
   */
  static isStrongPassword(password: string): boolean {
    const minLength = 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)

    return (
      password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers
    )
  }

  /**
   * Check if transaction hash format is valid (64 character hex)
   */
  static isValidTxHash(hash: string): boolean {
    const txHashRegex = /^[a-fA-F0-9]{64}$/
    return txHashRegex.test(hash)
  }
}
