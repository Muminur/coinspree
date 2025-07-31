import { NextRequest, NextResponse } from 'next/server'

/**
 * Security middleware to protect sensitive endpoints
 */
export class SecurityMiddleware {
  /**
   * Check if debug/dev endpoints should be blocked in production
   */
  static shouldBlockEndpoint(pathname: string): boolean {
    const isProduction = process.env.NODE_ENV === 'production'
    
    if (!isProduction) {
      return false // Allow in development
    }

    // Block debug endpoints in production
    if (pathname.startsWith('/api/debug/')) {
      return true
    }

    // Block dev endpoints in production
    if (pathname.startsWith('/api/dev/')) {
      return true
    }

    return false
  }

  /**
   * Create blocked endpoint response
   */
  static createBlockedResponse(): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: 'Endpoint not available',
        code: 'ENDPOINT_DISABLED'
      },
      { 
        status: 404,
        headers: {
          'X-Security-Block': 'true',
          'X-Environment': process.env.NODE_ENV || 'unknown'
        }
      }
    )
  }

  /**
   * Add security headers to response
   */
  static addSecurityHeaders(response: NextResponse): NextResponse {
    // Content Security Policy
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://api.coingecko.com https://*.vercel.app",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ')
    )

    // Security Headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    // HSTS (HTTP Strict Transport Security)
    if (process.env.NODE_ENV === 'production') {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      )
    }

    // Permission Policy
    response.headers.set(
      'Permissions-Policy',
      [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'interest-cohort=()'
      ].join(', ')
    )

    return response
  }

  /**
   * Validate admin authorization with comprehensive checks
   */
  static async validateAdminAccess(
    userId: string,
    getUserById: (id: string) => Promise<any>
  ): Promise<{ isValid: boolean; user?: any; error?: string }> {
    try {
      if (!userId) {
        return { isValid: false, error: 'User ID required' }
      }

      const user = await getUserById(userId)
      
      if (!user) {
        return { isValid: false, error: 'User not found' }
      }

      if (!user.isActive) {
        return { isValid: false, error: 'User account inactive' }
      }

      if (user.role !== 'admin') {
        return { isValid: false, error: 'Admin privileges required' }
      }

      return { isValid: true, user }
    } catch (error) {
      console.error('Admin validation error:', error)
      return { isValid: false, error: 'Validation failed' }
    }
  }

  /**
   * Sanitize error messages for production
   */
  static sanitizeError(error: any, isProduction: boolean = process.env.NODE_ENV === 'production'): string {
    if (!isProduction) {
      // Show detailed errors in development
      if (error instanceof Error) {
        return error.message
      }
      return String(error)
    }

    // Generic errors in production
    if (error instanceof Error) {
      // Map common errors to user-friendly messages
      const errorMessage = error.message.toLowerCase()
      
      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        return 'Resource not found'
      }
      
      if (errorMessage.includes('unauthorized') || errorMessage.includes('access denied')) {
        return 'Access denied'
      }
      
      if (errorMessage.includes('invalid') || errorMessage.includes('validation')) {
        return 'Invalid input provided'
      }
      
      if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        return 'Too many requests. Please try again later'
      }
      
      if (errorMessage.includes('timeout')) {
        return 'Request timeout. Please try again'
      }
    }

    // Default generic error
    return 'An error occurred. Please try again'
  }

  /**
   * Check if IP should be rate limited more strictly
   */
  static isHighRiskIP(request: NextRequest): boolean {
    const userAgent = request.headers.get('user-agent') || ''
    const acceptHeader = request.headers.get('accept') || ''
    
    // Check for bot-like behavior
    const suspiciousPatterms = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i
    ]
    
    if (suspiciousPatterms.some(pattern => pattern.test(userAgent))) {
      return true
    }
    
    // Check for missing standard headers
    if (!acceptHeader.includes('text/html') && !acceptHeader.includes('application/json')) {
      return true
    }
    
    return false
  }
}

/**
 * Rate limiter for different endpoint types
 */
export class EnhancedRateLimit {
  static getEndpointLimits(pathname: string): { interval: number; limit: number } {
    // Auth endpoints - stricter limits
    if (pathname.includes('/auth/')) {
      return {
        interval: process.env.NODE_ENV === 'development' ? 60 : 900, // 1min dev, 15min prod
        limit: process.env.NODE_ENV === 'development' ? 100 : 5
      }
    }
    
    // Admin endpoints - very strict limits
    if (pathname.includes('/admin/')) {
      return {
        interval: 300, // 5 minutes
        limit: process.env.NODE_ENV === 'development' ? 100 : 20
      }
    }
    
    // User profile updates
    if (pathname.includes('/user/') && pathname.includes('PUT')) {
      return {
        interval: 300, // 5 minutes
        limit: 10
      }
    }
    
    // Subscription operations
    if (pathname.includes('/subscription/')) {
      return {
        interval: 600, // 10 minutes
        limit: 5
      }
    }
    
    // Default API limits
    return {
      interval: 60, // 1 minute
      limit: process.env.NODE_ENV === 'development' ? 1000 : 100
    }
  }
}