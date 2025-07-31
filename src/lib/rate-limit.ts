import { NextRequest } from 'next/server'
import { kv } from '@vercel/kv'

interface RateLimitOptions {
  interval: number // seconds
  uniqueTokenPerInterval: number
}

export class RateLimit {
  private interval: number
  private uniqueTokenPerInterval: number

  constructor(options: RateLimitOptions) {
    this.interval = options.interval
    this.uniqueTokenPerInterval = options.uniqueTokenPerInterval
  }

  async check(
    request: NextRequest,
    identifier?: string
  ): Promise<{
    success: boolean
    limit: number
    remaining: number
    reset: number
  }> {
    const id = identifier || this.getIP(request) || 'anonymous'
    const key = `rate_limit:${id}:${Math.floor(Date.now() / (this.interval * 1000))}`

    const current = await kv.incr(key)

    if (current === 1) {
      await kv.expire(key, this.interval)
    }

    const remaining = Math.max(0, this.uniqueTokenPerInterval - current)
    const reset = Math.floor(Date.now() / 1000) + this.interval

    return {
      success: current <= this.uniqueTokenPerInterval,
      limit: this.uniqueTokenPerInterval,
      remaining,
      reset,
    }
  }

  private getIP(request: NextRequest): string | null {
    const forwarded = request.headers.get('x-forwarded-for')
    const real = request.headers.get('x-real-ip')

    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }

    if (real) {
      return real
    }

    return request.ip || null
  }
}

// Rate limiters for different endpoints
export const authLimiter = new RateLimit({
  interval: process.env.NODE_ENV === 'development' ? 60 : 900, // 1 minute in dev, 15 minutes in prod
  uniqueTokenPerInterval: process.env.NODE_ENV === 'development' ? 100 : 5, // More attempts in dev
})

export const passwordResetLimiter = new RateLimit({
  interval: 3600, // 1 hour
  uniqueTokenPerInterval: 3, // 3 reset attempts per hour
})

export const adminLimiter = new RateLimit({
  interval: 300, // 5 minutes
  uniqueTokenPerInterval: process.env.NODE_ENV === 'development' ? 1000 : 20, // 20 admin actions per 5 minutes
})

export const userProfileLimiter = new RateLimit({
  interval: 300, // 5 minutes
  uniqueTokenPerInterval: 10, // 10 profile updates per 5 minutes
})

export const subscriptionLimiter = new RateLimit({
  interval: 600, // 10 minutes
  uniqueTokenPerInterval: 5, // 5 subscription operations per 10 minutes
})

export const generalApiLimiter = new RateLimit({
  interval: 60, // 1 minute
  uniqueTokenPerInterval: process.env.NODE_ENV === 'development' ? 1000 : 100, // 100 API calls per minute
})
