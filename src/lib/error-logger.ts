/**
 * Centralized Error Logging System
 * 
 * This utility provides a consistent way to log errors throughout the application
 * with automatic categorization, context collection, and integration with the
 * error tracking dashboard.
 */

type ErrorLevel = 'critical' | 'error' | 'warning' | 'info'
type ErrorCategory = 'auth' | 'payment' | 'email' | 'api' | 'database' | 'crypto' | 'system' | 'user'

interface ErrorContext {
  userId?: string
  userEmail?: string
  endpoint?: string
  method?: string
  statusCode?: number
  userAgent?: string
  ip?: string
  metadata?: Record<string, any>
}

interface LogErrorOptions {
  level: ErrorLevel
  category: ErrorCategory
  message: string
  error?: Error
  context?: ErrorContext
}

class ErrorLogger {
  private static instance: ErrorLogger
  private isProduction = process.env.NODE_ENV === 'production'
  private logToConsole = process.env.NODE_ENV === 'development'

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  /**
   * Log an error with automatic categorization and context collection
   */
  async logError(options: LogErrorOptions): Promise<void> {
    try {
      const { level, category, message, error, context = {} } = options

      // Always log to console in development
      if (this.logToConsole) {
        const emoji = this.getLevelEmoji(level)
        const categoryEmoji = this.getCategoryEmoji(category)
        console.error(`${emoji} ${categoryEmoji} [${level.toUpperCase()}] ${category}: ${message}`)
        if (error?.stack) {
          console.error('Stack trace:', error.stack)
        }
        if (Object.keys(context).length > 0) {
          console.error('Context:', context)
        }
      }

      // Send to error tracking API
      await this.sendToErrorTracker({
        level,
        category,
        message,
        stack: error?.stack,
        ...context
      })

    } catch (logError) {
      // Fallback logging if error tracking fails
      console.error('Failed to log error:', logError)
      console.error('Original error:', options.message, options.error)
    }
  }

  /**
   * Log a critical error that requires immediate attention
   */
  async logCritical(category: ErrorCategory, message: string, error?: Error, context?: ErrorContext): Promise<void> {
    await this.logError({
      level: 'critical',
      category,
      message,
      error,
      context
    })
  }

  /**
   * Log a regular error
   */
  async logErr(category: ErrorCategory, message: string, error?: Error, context?: ErrorContext): Promise<void> {
    await this.logError({
      level: 'error',
      category,
      message,
      error,
      context
    })
  }

  /**
   * Log a warning
   */
  async logWarning(category: ErrorCategory, message: string, error?: Error, context?: ErrorContext): Promise<void> {
    await this.logError({
      level: 'warning',
      category,
      message,
      error,
      context
    })
  }

  /**
   * Log an info message
   */
  async logInfo(category: ErrorCategory, message: string, error?: Error, context?: ErrorContext): Promise<void> {
    await this.logError({
      level: 'info',
      category,
      message,
      error,
      context
    })
  }

  /**
   * Log an authentication error
   */
  async logAuthError(message: string, error?: Error, context?: ErrorContext): Promise<void> {
    await this.logError({
      level: 'error',
      category: 'auth',
      message,
      error,
      context
    })
  }

  /**
   * Log a payment error
   */
  async logPaymentError(message: string, error?: Error, context?: ErrorContext): Promise<void> {
    await this.logError({
      level: 'error',
      category: 'payment',
      message,
      error,
      context
    })
  }

  /**
   * Log an email error
   */
  async logEmailError(message: string, error?: Error, context?: ErrorContext): Promise<void> {
    await this.logError({
      level: 'error',
      category: 'email',
      message,
      error,
      context
    })
  }

  /**
   * Log a database error
   */
  async logDatabaseError(message: string, error?: Error, context?: ErrorContext): Promise<void> {
    await this.logError({
      level: 'error',
      category: 'database',
      message,
      error,
      context
    })
  }

  /**
   * Log a crypto/blockchain error
   */
  async logCryptoError(message: string, error?: Error, context?: ErrorContext): Promise<void> {
    await this.logError({
      level: 'error',
      category: 'crypto',
      message,
      error,
      context
    })
  }

  /**
   * Log an API error
   */
  async logAPIError(message: string, error?: Error, context?: ErrorContext): Promise<void> {
    await this.logError({
      level: 'error',
      category: 'api',
      message,
      error,
      context
    })
  }

  /**
   * Log a system error
   */
  async logSystemError(message: string, error?: Error, context?: ErrorContext): Promise<void> {
    await this.logError({
      level: 'critical',
      category: 'system',
      message,
      error,
      context
    })
  }

  /**
   * Wrap an async function with automatic error logging
   */
  wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    category: ErrorCategory,
    functionName: string
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args)
      } catch (error) {
        await this.logError({
          level: 'error',
          category,
          message: `Error in ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: error instanceof Error ? error : new Error(String(error)),
          context: {
            functionName,
            arguments: args.length > 0 ? { argCount: args.length } : undefined
          }
        })
        throw error
      }
    }
  }

  /**
   * Wrap a sync function with automatic error logging
   */
  wrapSync<T extends any[], R>(
    fn: (...args: T) => R,
    category: ErrorCategory,
    functionName: string
  ): (...args: T) => R {
    return (...args: T): R => {
      try {
        return fn(...args)
      } catch (error) {
        // Fire and forget async logging for sync functions
        this.logError({
          level: 'error',
          category,
          message: `Error in ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: error instanceof Error ? error : new Error(String(error)),
          context: {
            functionName,
            arguments: args.length > 0 ? { argCount: args.length } : undefined
          }
        }).catch(logError => {
          console.error('Failed to log sync function error:', logError)
        })
        throw error
      }
    }
  }

  /**
   * Create an error context from a Next.js request
   */
  createRequestContext(request: Request, userId?: string, userEmail?: string): ErrorContext {
    const url = new URL(request.url)
    return {
      userId,
      userEmail,
      endpoint: url.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      metadata: {
        host: url.host,
        search: url.search,
        referrer: request.headers.get('referrer') || undefined
      }
    }
  }

  /**
   * Send error data to the error tracking API
   */
  private async sendToErrorTracker(errorData: Record<string, any>): Promise<void> {
    try {
      // Only send to API in production or when explicitly enabled
      if (!this.isProduction && process.env.ENABLE_ERROR_TRACKING !== 'true') {
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/error-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData)
      })

      if (!response.ok) {
        throw new Error(`Error tracking API responded with ${response.status}`)
      }
    } catch (error) {
      // Don't throw here to avoid infinite loops
      if (this.logToConsole) {
        console.error('Failed to send error to tracking API:', error)
      }
    }
  }

  /**
   * Get emoji for error level
   */
  private getLevelEmoji(level: ErrorLevel): string {
    const emojis = {
      critical: '🚨',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    }
    return emojis[level]
  }

  /**
   * Get emoji for error category
   */
  private getCategoryEmoji(category: ErrorCategory): string {
    const emojis = {
      auth: '🔐',
      payment: '💳',
      email: '📧',
      api: '🔌',
      database: '🗄️',
      crypto: '🪙',
      system: '⚙️',
      user: '👤'
    }
    return emojis[category]
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance()

// Export convenient error logging functions
export const logCritical = errorLogger.logCritical.bind(errorLogger)
export const logError = errorLogger.logErr.bind(errorLogger)
export const logWarning = errorLogger.logWarning.bind(errorLogger)
export const logInfo = errorLogger.logInfo.bind(errorLogger)

export const logAuthError = errorLogger.logAuthError.bind(errorLogger)
export const logPaymentError = errorLogger.logPaymentError.bind(errorLogger)
export const logEmailError = errorLogger.logEmailError.bind(errorLogger)
export const logDatabaseError = errorLogger.logDatabaseError.bind(errorLogger)
export const logCryptoError = errorLogger.logCryptoError.bind(errorLogger)
export const logAPIError = errorLogger.logAPIError.bind(errorLogger)
export const logSystemError = errorLogger.logSystemError.bind(errorLogger)

export const wrapAsync = errorLogger.wrapAsync.bind(errorLogger)
export const wrapSync = errorLogger.wrapSync.bind(errorLogger)
export const createRequestContext = errorLogger.createRequestContext.bind(errorLogger)

// Export types for use in other modules
export type { ErrorLevel, ErrorCategory, ErrorContext, LogErrorOptions }