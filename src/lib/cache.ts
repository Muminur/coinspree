import { KV } from './kv'

// Cache configuration
export const CACHE_CONFIG = {
  // TTL values in seconds
  TTL: {
    CRYPTO_DATA: 60, // 1 minute for crypto data
    USER_SESSION: 3600, // 1 hour for user sessions
    SUBSCRIPTION_DATA: 1800, // 30 minutes for subscription data
    EMAIL_TEMPLATES: 86400, // 24 hours for email templates
    SYSTEM_CONFIG: 3600, // 1 hour for system configuration
    ANALYTICS_HOURLY: 3600, // 1 hour for hourly analytics
    ANALYTICS_DAILY: 86400, // 24 hours for daily analytics
    API_RESPONSES: 300, // 5 minutes for API responses
    DATABASE_QUERIES: 180, // 3 minutes for database query results
    SEARCH_RESULTS: 600 // 10 minutes for search results
  },
  
  // Cache key prefixes
  PREFIXES: {
    CRYPTO: 'cache:crypto:',
    USER: 'cache:user:',
    SUBSCRIPTION: 'cache:sub:',
    EMAIL: 'cache:email:',
    ANALYTICS: 'cache:analytics:',
    API: 'cache:api:',
    DB_QUERY: 'cache:db:',
    SEARCH: 'cache:search:'
  }
}

export interface CacheOptions {
  ttl?: number
  prefix?: string
  enableCompression?: boolean
  enableMetrics?: boolean
}

export interface CacheMetrics {
  hits: number
  misses: number
  sets: number
  deletes: number
  errors: number
  totalRequests: number
  hitRate: number
  lastUpdated: string
}

/**
 * Advanced caching service with compression, metrics, and intelligent invalidation
 */
export class CacheService {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    totalRequests: 0,
    hitRate: 0,
    lastUpdated: new Date().toISOString()
  }

  /**
   * Get cached data with automatic decompression and metrics tracking
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      this.metrics.totalRequests++
      
      const cacheKey = this.buildKey(key, options.prefix)
      const cached = await KV.get(cacheKey)
      
      if (cached === null) {
        this.metrics.misses++
        this.updateHitRate()
        return null
      }
      
      this.metrics.hits++
      this.updateHitRate()
      
      // Parse cached data
      const parsedData = JSON.parse(cached)
      
      // Handle compressed data
      if (options.enableCompression && parsedData.compressed) {
        return this.decompress(parsedData.data)
      }
      
      return parsedData.data || parsedData
    } catch (error) {
      this.metrics.errors++
      console.error('Cache get error:', error)
      return null
    }
  }

  /**
   * Set cached data with automatic compression and TTL management
   */
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      this.metrics.sets++
      
      const cacheKey = this.buildKey(key, options.prefix)
      const ttl = options.ttl || CACHE_CONFIG.TTL.API_RESPONSES
      
      let cacheData: any = { data, cached_at: new Date().toISOString() }
      
      // Apply compression for large objects
      if (options.enableCompression && this.shouldCompress(data)) {
        cacheData = {
          data: await this.compress(data),
          compressed: true,
          cached_at: new Date().toISOString()
        }
      }
      
      const serialized = JSON.stringify(cacheData)
      await KV.set(cacheKey, serialized, { ex: ttl })
      
      // Track cache metrics if enabled
      if (options.enableMetrics) {
        await this.trackCacheMetrics(key, 'set', serialized.length)
      }
      
      return true
    } catch (error) {
      this.metrics.errors++
      console.error('Cache set error:', error)
      return false
    }
  }

  /**
   * Delete cached data and update metrics
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      this.metrics.deletes++
      
      const cacheKey = this.buildKey(key, options.prefix)
      const result = await KV.del(cacheKey)
      
      return result > 0
    } catch (error) {
      this.metrics.errors++
      console.error('Cache delete error:', error)
      return false
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options)
    
    if (cached !== null) {
      return cached
    }
    
    // Execute function to get fresh data
    const freshData = await fetchFunction()
    
    // Cache the result
    await this.set(key, freshData, options)
    
    return freshData
  }

  /**
   * Invalidate cache by pattern (e.g., user:123:*)
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await KV.keys(pattern)
      
      if (keys.length === 0) {
        return 0
      }
      
      const results = await Promise.allSettled(
        keys.map(key => KV.del(key))
      )
      
      const deletedCount = results.filter(
        result => result.status === 'fulfilled' && result.value > 0
      ).length
      
      this.metrics.deletes += deletedCount
      
      return deletedCount
    } catch (error) {
      this.metrics.errors++
      console.error('Cache invalidatePattern error:', error)
      return 0
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(): Promise<void> {
    try {
      console.log('Starting cache warm-up...')
      
      // Warm up crypto data
      await this.warmUpCryptoData()
      
      // Warm up system configuration
      await this.warmUpSystemConfig()
      
      // Warm up email templates
      await this.warmUpEmailTemplates()
      
      console.log('Cache warm-up completed')
    } catch (error) {
      console.error('Cache warm-up error:', error)
    }
  }

  /**
   * Get cache statistics and metrics
   */
  async getMetrics(): Promise<CacheMetrics & { keyStats: any }> {
    try {
      // Get key statistics
      const allKeys = await KV.keys('cache:*')
      const keyStats = {
        totalKeys: allKeys.length,
        byPrefix: {} as Record<string, number>
      }
      
      // Count keys by prefix
      for (const key of allKeys) {
        const prefix = key.split(':')[1]
        keyStats.byPrefix[prefix] = (keyStats.byPrefix[prefix] || 0) + 1
      }
      
      return {
        ...this.metrics,
        keyStats,
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Cache getMetrics error:', error)
      return {
        ...this.metrics,
        keyStats: { totalKeys: 0, byPrefix: {} }
      }
    }
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<number> {
    try {
      const keys = await KV.keys('cache:*')
      
      if (keys.length === 0) {
        return 0
      }
      
      const results = await Promise.allSettled(
        keys.map(key => KV.del(key))
      )
      
      const deletedCount = results.filter(
        result => result.status === 'fulfilled' && result.value > 0
      ).length
      
      // Reset metrics
      this.metrics = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        totalRequests: 0,
        hitRate: 0,
        lastUpdated: new Date().toISOString()
      }
      
      return deletedCount
    } catch (error) {
      console.error('Cache clear error:', error)
      return 0
    }
  }

  // Private helper methods

  private buildKey(key: string, prefix?: string): string {
    if (prefix) {
      return `${prefix}${key}`
    }
    return `cache:${key}`
  }

  private updateHitRate(): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.hits / this.metrics.totalRequests) * 100 
      : 0
    this.metrics.lastUpdated = new Date().toISOString()
  }

  private shouldCompress<T>(data: T): boolean {
    try {
      const serialized = JSON.stringify(data)
      return serialized.length > 1024 // Compress if larger than 1KB
    } catch {
      return false
    }
  }

  private async compress<T>(data: T): Promise<string> {
    // Simple compression using JSON stringification with space removal
    // In production, you might want to use a proper compression library
    const serialized = JSON.stringify(data)
    return Buffer.from(serialized).toString('base64')
  }

  private async decompress<T>(compressedData: string): Promise<T> {
    try {
      const decompressed = Buffer.from(compressedData, 'base64').toString('utf-8')
      return JSON.parse(decompressed)
    } catch (error) {
      throw new Error('Failed to decompress cache data')
    }
  }

  private async trackCacheMetrics(key: string, operation: string, size: number): Promise<void> {
    try {
      const metricsKey = `cache_metrics:${new Date().toISOString().split('T')[0]}`
      const metrics = await KV.hgetall(metricsKey) || {}
      
      const currentStats = {
        operations: parseInt(metrics.operations || '0') + 1,
        totalSize: parseInt(metrics.totalSize || '0') + size,
        lastOperation: new Date().toISOString()
      }
      
      await KV.hset(metricsKey, currentStats)
      await KV.expire(metricsKey, 86400 * 7) // Keep for 7 days
    } catch (error) {
      console.error('Error tracking cache metrics:', error)
    }
  }

  private async warmUpCryptoData(): Promise<void> {
    try {
      // This would typically fetch and cache frequently accessed crypto data
      const cryptoKey = this.buildKey('top100', CACHE_CONFIG.PREFIXES.CRYPTO)
      
      // Simulate fetching crypto data
      const cryptoData = { 
        coins: [], 
        lastUpdated: new Date().toISOString(),
        warmedUp: true
      }
      
      await this.set(cryptoKey, cryptoData, {
        ttl: CACHE_CONFIG.TTL.CRYPTO_DATA,
        prefix: '',
        enableCompression: true
      })
    } catch (error) {
      console.error('Error warming up crypto data:', error)
    }
  }

  private async warmUpSystemConfig(): Promise<void> {
    try {
      const configKey = this.buildKey('system', CACHE_CONFIG.PREFIXES.EMAIL)
      
      const systemConfig = {
        emailConfig: {},
        subscriptionPlans: {},
        warmedUp: true,
        lastUpdated: new Date().toISOString()
      }
      
      await this.set(configKey, systemConfig, {
        ttl: CACHE_CONFIG.TTL.SYSTEM_CONFIG,
        prefix: ''
      })
    } catch (error) {
      console.error('Error warming up system config:', error)
    }
  }

  private async warmUpEmailTemplates(): Promise<void> {
    try {
      const templatesKey = this.buildKey('templates', CACHE_CONFIG.PREFIXES.EMAIL)
      
      const emailTemplates = {
        ath_notification: {},
        welcome: {},
        subscription_expiry: {},
        password_reset: {},
        warmedUp: true,
        lastUpdated: new Date().toISOString()
      }
      
      await this.set(templatesKey, emailTemplates, {
        ttl: CACHE_CONFIG.TTL.EMAIL_TEMPLATES,
        prefix: ''
      })
    } catch (error) {
      console.error('Error warming up email templates:', error)
    }
  }
}

// Export singleton instance
export const Cache = new CacheService()

// Helper functions for common caching patterns

/**
 * Cache crypto data with optimized TTL
 */
export async function cacheCryptoData<T>(key: string, data: T): Promise<boolean> {
  return Cache.set(key, data, {
    prefix: CACHE_CONFIG.PREFIXES.CRYPTO,
    ttl: CACHE_CONFIG.TTL.CRYPTO_DATA,
    enableCompression: true,
    enableMetrics: true
  })
}

/**
 * Get cached crypto data
 */
export async function getCachedCryptoData<T>(key: string): Promise<T | null> {
  return Cache.get<T>(key, {
    prefix: CACHE_CONFIG.PREFIXES.CRYPTO,
    enableCompression: true
  })
}

/**
 * Cache user data with session TTL
 */
export async function cacheUserData<T>(userId: string, data: T): Promise<boolean> {
  return Cache.set(userId, data, {
    prefix: CACHE_CONFIG.PREFIXES.USER,
    ttl: CACHE_CONFIG.TTL.USER_SESSION,
    enableMetrics: true
  })
}

/**
 * Get cached user data
 */
export async function getCachedUserData<T>(userId: string): Promise<T | null> {
  return Cache.get<T>(userId, {
    prefix: CACHE_CONFIG.PREFIXES.USER
  })
}

/**
 * Cache database query results
 */
export async function cacheDBQuery<T>(queryHash: string, results: T): Promise<boolean> {
  return Cache.set(queryHash, results, {
    prefix: CACHE_CONFIG.PREFIXES.DB_QUERY,
    ttl: CACHE_CONFIG.TTL.DATABASE_QUERIES,
    enableCompression: true,
    enableMetrics: true
  })
}

/**
 * Get cached database query results
 */
export async function getCachedDBQuery<T>(queryHash: string): Promise<T | null> {
  return Cache.get<T>(queryHash, {
    prefix: CACHE_CONFIG.PREFIXES.DB_QUERY,
    enableCompression: true
  })
}

/**
 * Invalidate user-related cache
 */
export async function invalidateUserCache(userId: string): Promise<number> {
  return Cache.invalidatePattern(`${CACHE_CONFIG.PREFIXES.USER}${userId}*`)
}

/**
 * Invalidate crypto-related cache
 */
export async function invalidateCryptoCache(): Promise<number> {
  return Cache.invalidatePattern(`${CACHE_CONFIG.PREFIXES.CRYPTO}*`)
}