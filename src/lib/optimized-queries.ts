import { KV } from './kv'
import { Cache, cacheDBQuery, getCachedDBQuery } from './cache'
import crypto from 'crypto'

/**
 * Query optimization and caching utilities
 */

export interface QueryOptions {
  useCache?: boolean
  cacheTTL?: number
  enableProfiling?: boolean
  timeout?: number
}

export interface QueryProfile {
  query: string
  executionTime: number
  cacheHit: boolean
  resultSize: number
  timestamp: string
  optimized: boolean
}

export interface QueryStats {
  totalQueries: number
  averageExecutionTime: number
  cacheHitRate: number
  slowQueries: QueryProfile[]
  topQueries: Array<{
    queryHash: string
    count: number
    averageTime: number
    lastExecuted: string
  }>
}

/**
 * Optimized database query service with intelligent caching and performance monitoring
 */
export class OptimizedQueryService {
  private queryProfiles: Map<string, QueryProfile[]> = new Map()
  private queryStats: Map<string, { count: number; totalTime: number; lastExecuted: string }> = new Map()

  /**
   * Execute optimized user queries with caching
   */
  async getUserById(userId: string, options: QueryOptions = {}): Promise<any | null> {
    const queryHash = this.generateQueryHash('getUserById', { userId })
    
    return this.executeQuery(
      queryHash,
      'getUserById',
      async () => {
        // Optimized single-key lookup
        const user = await KV.hgetall(`user:${userId}`)
        return user && user.id ? user : null
      },
      { ...options, cacheTTL: 1800 } // 30 minutes cache
    )
  }

  /**
   * Execute optimized user search with pagination and caching
   */
  async searchUsers(query: string, page: number = 1, limit: number = 20, options: QueryOptions = {}): Promise<any> {
    const queryHash = this.generateQueryHash('searchUsers', { query, page, limit })
    
    return this.executeQuery(
      queryHash,
      'searchUsers',
      async () => {
        // Get all user keys (in production, this would be optimized with proper indexing)
        const userKeys = await KV.keys('user:*')
        const users = []
        
        // Batch fetch users to reduce Redis round trips
        const batchSize = 100
        for (let i = 0; i < userKeys.length; i += batchSize) {
          const batch = userKeys.slice(i, i + batchSize)
          const batchResults = await Promise.all(
            batch.map(key => KV.hgetall(key))
          )
          
          // Filter and search
          const filteredBatch = batchResults.filter(user => {
            if (!user || !user.id) return false
            if (!query) return true
            
            const searchTerm = query.toLowerCase()
            return (
              user.email?.toLowerCase().includes(searchTerm) ||
              user.id?.toLowerCase().includes(searchTerm)
            )
          })
          
          users.push(...filteredBatch)
        }
        
        // Apply pagination
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        const paginatedUsers = users.slice(startIndex, endIndex)
        
        return {
          users: paginatedUsers,
          total: users.length,
          page,
          limit,
          totalPages: Math.ceil(users.length / limit)
        }
      },
      { ...options, cacheTTL: 300 } // 5 minutes cache for search results
    )
  }

  /**
   * Execute optimized subscription queries with caching
   */
  async getUserSubscriptions(userId: string, options: QueryOptions = {}): Promise<any[]> {
    const queryHash = this.generateQueryHash('getUserSubscriptions', { userId })
    
    return this.executeQuery(
      queryHash,
      'getUserSubscriptions',
      async () => {
        // Get subscription IDs for user
        const subscriptionIds = await KV.smembers(`user_subscriptions:${userId}`)
        
        if (subscriptionIds.length === 0) {
          return []
        }
        
        // Batch fetch subscriptions
        const subscriptions = await Promise.all(
          subscriptionIds.map(id => KV.hgetall(`subscription:${id}`))
        )
        
        return subscriptions
          .filter(sub => sub && sub.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      },
      { ...options, cacheTTL: 900 } // 15 minutes cache
    )
  }

  /**
   * Execute optimized analytics queries with aggressive caching
   */
  async getAnalyticsData(type: string, timeRange: string, options: QueryOptions = {}): Promise<any> {
    const queryHash = this.generateQueryHash('getAnalyticsData', { type, timeRange })
    
    return this.executeQuery(
      queryHash,
      'getAnalyticsData',
      async () => {
        const now = new Date()
        const startDate = this.getStartDate(timeRange, now)
        
        switch (type) {
          case 'user_engagement':
            return this.getUserEngagementAnalytics(startDate, now)
          case 'subscription_metrics':
            return this.getSubscriptionMetrics(startDate, now)
          case 'email_performance':
            return this.getEmailPerformanceMetrics(startDate, now)
          default:
            throw new Error(`Unknown analytics type: ${type}`)
        }
      },
      { ...options, cacheTTL: 3600 } // 1 hour cache for analytics
    )
  }

  /**
   * Execute optimized crypto data queries with short-term caching
   */
  async getCryptoData(limit: number = 100, options: QueryOptions = {}): Promise<any[]> {
    const queryHash = this.generateQueryHash('getCryptoData', { limit })
    
    return this.executeQuery(
      queryHash,
      'getCryptoData',
      async () => {
        // Get all crypto asset keys
        const cryptoKeys = await KV.keys('crypto:*')
        
        // Batch fetch crypto data
        const batchSize = 50
        const cryptoAssets = []
        
        for (let i = 0; i < cryptoKeys.length && cryptoAssets.length < limit; i += batchSize) {
          const batch = cryptoKeys.slice(i, i + batchSize)
          const batchResults = await Promise.all(
            batch.map(key => KV.hgetall(key))
          )
          
          const validAssets = batchResults
            .filter(asset => asset && asset.id)
            .map(asset => ({
              ...asset,
              currentPrice: parseFloat(asset.currentPrice || '0'),
              marketCap: parseFloat(asset.marketCap || '0'),
              marketCapRank: parseInt(asset.marketCapRank || '0'),
              ath: parseFloat(asset.ath || '0')
            }))
          
          cryptoAssets.push(...validAssets)
        }
        
        // Sort by market cap rank and limit results
        return cryptoAssets
          .sort((a, b) => a.marketCapRank - b.marketCapRank)
          .slice(0, limit)
      },
      { ...options, cacheTTL: 60 } // 1 minute cache for crypto data
    )
  }

  /**
   * Execute batch operations with connection pooling simulation
   */
  async batchUpdateUsers(updates: Array<{ userId: string; data: any }>, options: QueryOptions = {}): Promise<number> {
    const startTime = Date.now()
    let updatedCount = 0
    
    try {
      // Process updates in batches to avoid overwhelming Redis
      const batchSize = 20
      const batches = []
      
      for (let i = 0; i < updates.length; i += batchSize) {
        batches.push(updates.slice(i, i + batchSize))
      }
      
      // Execute batches concurrently
      const results = await Promise.allSettled(
        batches.map(batch => this.processBatchUpdate(batch))
      )
      
      // Count successful updates
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          updatedCount += result.value
        }
      })
      
      // Invalidate user cache for updated users
      await Promise.allSettled(
        updates.map(update => Cache.invalidatePattern(`cache:user:${update.userId}*`))
      )
      
      // Profile this batch operation
      if (options.enableProfiling) {
        await this.profileQuery('batchUpdateUsers', Date.now() - startTime, false, updatedCount)
      }
      
      return updatedCount
    } catch (error) {
      console.error('Batch update error:', error)
      return updatedCount
    }
  }

  /**
   * Get query performance statistics
   */
  async getQueryStats(): Promise<QueryStats> {
    try {
      const stats = Array.from(this.queryStats.entries()).map(([queryHash, stat]) => ({
        queryHash,
        count: stat.count,
        averageTime: stat.totalTime / stat.count,
        lastExecuted: stat.lastExecuted
      }))
      
      const allProfiles = Array.from(this.queryProfiles.values()).flat()
      const totalQueries = allProfiles.length
      const averageExecutionTime = totalQueries > 0 
        ? allProfiles.reduce((sum, profile) => sum + profile.executionTime, 0) / totalQueries 
        : 0
      
      const cacheHits = allProfiles.filter(p => p.cacheHit).length
      const cacheHitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0
      
      const slowQueries = allProfiles
        .filter(p => p.executionTime > 1000) // Queries slower than 1 second
        .sort((a, b) => b.executionTime - a.executionTime)
        .slice(0, 10)
      
      const topQueries = stats
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
      
      return {
        totalQueries,
        averageExecutionTime,
        cacheHitRate,
        slowQueries,
        topQueries
      }
    } catch (error) {
      console.error('Error getting query stats:', error)
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        cacheHitRate: 0,
        slowQueries: [],
        topQueries: []
      }
    }
  }

  /**
   * Clear query statistics and profiles
   */
  clearStats(): void {
    this.queryProfiles.clear()
    this.queryStats.clear()
  }

  // Private helper methods

  private async executeQuery<T>(
    queryHash: string,
    queryName: string,
    queryFunction: () => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const startTime = Date.now()
    let cacheHit = false
    let result: T
    
    try {
      // Try to get from cache first
      if (options.useCache !== false) {
        const cached = await getCachedDBQuery<T>(queryHash)
        if (cached !== null) {
          cacheHit = true
          result = cached
        }
      }
      
      // Execute query if not cached
      if (!cacheHit) {
        result = await this.executeWithTimeout(queryFunction, options.timeout || 30000)
        
        // Cache the result
        if (options.useCache !== false) {
          await cacheDBQuery(queryHash, result, options.cacheTTL)
        }
      }
      
      // Profile the query
      if (options.enableProfiling !== false) {
        await this.profileQuery(queryName, Date.now() - startTime, cacheHit, this.getResultSize(result))
      }
      
      return result
    } catch (error) {
      // Profile failed queries too
      if (options.enableProfiling !== false) {
        await this.profileQuery(queryName, Date.now() - startTime, cacheHit, 0, error as Error)
      }
      throw error
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      )
    ])
  }

  private generateQueryHash(queryName: string, params: any): string {
    const paramString = JSON.stringify(params, Object.keys(params).sort())
    return crypto.createHash('md5').update(`${queryName}:${paramString}`).digest('hex')
  }

  private async profileQuery(
    queryName: string,
    executionTime: number,
    cacheHit: boolean,
    resultSize: number,
    error?: Error
  ): Promise<void> {
    try {
      const profile: QueryProfile = {
        query: queryName,
        executionTime,
        cacheHit,
        resultSize,
        timestamp: new Date().toISOString(),
        optimized: executionTime < 1000 && !error
      }
      
      // Store profile
      if (!this.queryProfiles.has(queryName)) {
        this.queryProfiles.set(queryName, [])
      }
      
      const profiles = this.queryProfiles.get(queryName)!
      profiles.push(profile)
      
      // Keep only last 100 profiles per query
      if (profiles.length > 100) {
        profiles.splice(0, profiles.length - 100)
      }
      
      // Update query stats
      const queryHash = this.generateQueryHash(queryName, {})
      const currentStats = this.queryStats.get(queryHash) || { count: 0, totalTime: 0, lastExecuted: '' }
      
      this.queryStats.set(queryHash, {
        count: currentStats.count + 1,
        totalTime: currentStats.totalTime + executionTime,
        lastExecuted: new Date().toISOString()
      })
      
      // Log slow queries
      if (executionTime > 2000) {
        console.warn(`Slow query detected: ${queryName} (${executionTime}ms)`)
        
        // Store slow query for admin review
        await KV.hset(`slow_query:${Date.now()}`, {
          query: queryName,
          executionTime,
          timestamp: new Date().toISOString(),
          cacheHit: cacheHit.toString(),
          resultSize: resultSize.toString()
        })
        
        // Set expiration for slow query logs (7 days)
        await KV.expire(`slow_query:${Date.now()}`, 86400 * 7)
      }
    } catch (error) {
      console.error('Error profiling query:', error)
    }
  }

  private getResultSize(result: any): number {
    try {
      return JSON.stringify(result).length
    } catch {
      return 0
    }
  }

  private async processBatchUpdate(batch: Array<{ userId: string; data: any }>): Promise<number> {
    let updatedCount = 0
    
    for (const update of batch) {
      try {
        const userKey = `user:${update.userId}`
        const currentUser = await KV.hgetall(userKey)
        
        if (currentUser && currentUser.id) {
          await KV.hset(userKey, {
            ...currentUser,
            ...update.data,
            updatedAt: new Date().toISOString()
          })
          updatedCount++
        }
      } catch (error) {
        console.error(`Error updating user ${update.userId}:`, error)
      }
    }
    
    return updatedCount
  }

  private getStartDate(timeRange: string, now: Date): Date {
    const start = new Date(now)
    
    switch (timeRange) {
      case '1h':
        start.setHours(start.getHours() - 1)
        break
      case '24h':
        start.setDate(start.getDate() - 1)
        break
      case '7d':
        start.setDate(start.getDate() - 7)
        break
      case '30d':
        start.setDate(start.getDate() - 30)
        break
      default:
        start.setDate(start.getDate() - 1) // Default to 24h
    }
    
    return start
  }

  private async getUserEngagementAnalytics(startDate: Date, endDate: Date): Promise<any> {
    // Simulate user engagement analytics query
    return {
      totalUsers: 150,
      activeUsers: 89,
      sessionDuration: 24.5,
      pageViews: 2340,
      bounceRate: 32.1,
      timeRange: { start: startDate.toISOString(), end: endDate.toISOString() }
    }
  }

  private async getSubscriptionMetrics(startDate: Date, endDate: Date): Promise<any> {
    // Simulate subscription metrics query
    return {
      totalSubscriptions: 45,
      activeSubscriptions: 38,
      newSubscriptions: 7,
      churnRate: 15.6,
      revenue: 114,
      timeRange: { start: startDate.toISOString(), end: endDate.toISOString() }
    }
  }

  private async getEmailPerformanceMetrics(startDate: Date, endDate: Date): Promise<any> {
    // Simulate email performance metrics query
    return {
      totalSent: 892,
      delivered: 847,
      bounced: 23,
      opened: 312,
      clicked: 89,
      deliveryRate: 94.9,
      openRate: 36.8,
      clickRate: 10.5,
      timeRange: { start: startDate.toISOString(), end: endDate.toISOString() }
    }
  }
}

// Export singleton instance
export const OptimizedQueries = new OptimizedQueryService()

// Helper functions for common optimized queries

/**
 * Optimized user lookup with caching
 */
export async function getOptimizedUser(userId: string): Promise<any | null> {
  return OptimizedQueries.getUserById(userId, {
    useCache: true,
    enableProfiling: true
  })
}

/**
 * Optimized user search with caching
 */
export async function searchOptimizedUsers(query: string, page: number = 1, limit: number = 20): Promise<any> {
  return OptimizedQueries.searchUsers(query, page, limit, {
    useCache: true,
    enableProfiling: true
  })
}

/**
 * Optimized subscription lookup with caching
 */
export async function getOptimizedUserSubscriptions(userId: string): Promise<any[]> {
  return OptimizedQueries.getUserSubscriptions(userId, {
    useCache: true,
    enableProfiling: true
  })
}

/**
 * Optimized analytics data with aggressive caching
 */
export async function getOptimizedAnalytics(type: string, timeRange: string = '24h'): Promise<any> {
  return OptimizedQueries.getAnalyticsData(type, timeRange, {
    useCache: true,
    cacheTTL: 3600, // 1 hour cache
    enableProfiling: true
  })
}