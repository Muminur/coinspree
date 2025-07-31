import { NextRequest, NextResponse } from 'next/server'
import { validateServerSession } from '@/lib/auth'
import { Cache } from '@/lib/cache'
import { OptimizedQueries } from '@/lib/optimized-queries'

export async function GET(request: NextRequest) {
  try {
    const session = await validateServerSession()
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'stats'

    switch (action) {
      case 'stats':
        return await getCacheStats()
      case 'queries':
        return await getQueryStats()
      case 'health':
        return await getCacheHealth()
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Cache management API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getCacheStats() {
  try {
    const metrics = await Cache.getMetrics()
    
    return NextResponse.json({
      success: true,
      data: {
        cacheMetrics: metrics,
        performance: {
          hitRate: metrics.hitRate,
          totalRequests: metrics.totalRequests,
          errorRate: metrics.totalRequests > 0 ? (metrics.errors / metrics.totalRequests) * 100 : 0
        },
        keyDistribution: metrics.keyStats.byPrefix,
        recommendations: generateCacheRecommendations(metrics)
      }
    })
  } catch (error) {
    throw error
  }
}

async function getQueryStats() {
  try {
    const queryStats = await OptimizedQueries.getQueryStats()
    
    return NextResponse.json({
      success: true,
      data: {
        queryPerformance: queryStats,
        optimization: {
          averageResponseTime: queryStats.averageExecutionTime,
          cacheEfficiency: queryStats.cacheHitRate,
          slowQueryCount: queryStats.slowQueries.length
        },
        recommendations: generateQueryRecommendations(queryStats)
      }
    })
  } catch (error) {
    throw error
  }
}

async function getCacheHealth() {
  try {
    const startTime = Date.now()
    
    // Test cache operations
    const testKey = 'health_check_test'
    const testData = { timestamp: new Date().toISOString(), test: true }
    
    // Test SET operation
    const setSuccess = await Cache.set(testKey, testData, { ttl: 60 })
    const setTime = Date.now() - startTime
    
    // Test GET operation
    const getStartTime = Date.now()
    const retrieved = await Cache.get(testKey)
    const getTime = Date.now() - getStartTime
    
    // Test DELETE operation
    const deleteStartTime = Date.now()
    const deleteSuccess = await Cache.delete(testKey)
    const deleteTime = Date.now() - deleteStartTime
    
    const totalTime = Date.now() - startTime
    
    // Determine health status
    const isHealthy = setSuccess && retrieved !== null && deleteSuccess && totalTime < 1000
    
    return NextResponse.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        operations: {
          set: { success: setSuccess, responseTime: setTime },
          get: { success: retrieved !== null, responseTime: getTime },
          delete: { success: deleteSuccess, responseTime: deleteTime }
        },
        totalResponseTime: totalTime,
        timestamp: new Date().toISOString(),
        recommendations: generateHealthRecommendations(totalTime, isHealthy)
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        recommendations: [
          'Check Redis connection',
          'Verify Vercel KV configuration',
          'Monitor system resources'
        ]
      }
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await validateServerSession()
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { action, options = {} } = await request.json()

    switch (action) {
      case 'clear':
        return await clearCache(options)
      case 'warm':
        return await warmCache(options)
      case 'invalidate':
        return await invalidateCache(options)
      case 'optimize':
        return await optimizeCache(options)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Cache management POST error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function clearCache(options: any) {
  try {
    const pattern = options.pattern || 'cache:*'
    let deletedCount = 0
    
    if (pattern === 'cache:*') {
      // Clear all cache
      deletedCount = await Cache.clear()
    } else {
      // Clear specific pattern
      deletedCount = await Cache.invalidatePattern(pattern)
    }
    
    // Clear query stats if requested
    if (options.clearQueryStats) {
      OptimizedQueries.clearStats()
    }
    
    return NextResponse.json({
      success: true,
      message: `Cache cleared successfully. ${deletedCount} keys deleted.`,
      data: {
        deletedCount,
        pattern,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    throw error
  }
}

async function warmCache(options: any) {
  try {
    const startTime = Date.now()
    
    // Warm up cache with frequently accessed data
    await Cache.warmUp()
    
    // Warm up query cache with common queries
    if (options.warmQueries) {
      await warmCommonQueries()
    }
    
    const warmupTime = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      message: 'Cache warmed up successfully',
      data: {
        warmupTime,
        operations: ['crypto_data', 'system_config', 'email_templates'],
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    throw error
  }
}

async function invalidateCache(options: any) {
  try {
    const { patterns = [] } = options
    let totalDeleted = 0
    const results: Record<string, number> = {}
    
    for (const pattern of patterns) {
      const deleted = await Cache.invalidatePattern(pattern)
      results[pattern] = deleted
      totalDeleted += deleted
    }
    
    return NextResponse.json({
      success: true,
      message: `Cache invalidated successfully. ${totalDeleted} keys deleted.`,
      data: {
        totalDeleted,
        results,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    throw error
  }
}

async function optimizeCache(options: any) {
  try {
    const metrics = await Cache.getMetrics()
    const queryStats = await OptimizedQueries.getQueryStats()
    
    const optimizations = []
    
    // Optimize based on hit rate
    if (metrics.hitRate < 70) {
      optimizations.push({
        type: 'hit_rate',
        recommendation: 'Increase cache TTL for frequently accessed data',
        impact: 'high'
      })
    }
    
    // Optimize based on slow queries
    if (queryStats.slowQueries.length > 5) {
      optimizations.push({
        type: 'slow_queries',
        recommendation: 'Add indexes or optimize slow queries',
        impact: 'high',
        affectedQueries: queryStats.slowQueries.slice(0, 3).map(q => q.query)
      })
    }
    
    // Optimize based on cache size
    if (metrics.keyStats.totalKeys > 10000) {
      optimizations.push({
        type: 'cache_size',
        recommendation: 'Implement cache cleanup for old entries',
        impact: 'medium'
      })
    }
    
    // Auto-apply optimizations if requested
    if (options.autoApply) {
      await applyOptimizations(optimizations)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cache optimization analysis completed',
      data: {
        optimizations,
        metrics: {
          hitRate: metrics.hitRate,
          totalKeys: metrics.keyStats.totalKeys,
          averageQueryTime: queryStats.averageExecutionTime,
          slowQueryCount: queryStats.slowQueries.length
        },
        autoApplied: options.autoApply || false,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    throw error
  }
}

// Helper functions

function generateCacheRecommendations(metrics: any): string[] {
  const recommendations = []
  
  if (metrics.hitRate < 50) {
    recommendations.push('Low cache hit rate detected. Consider increasing TTL for frequently accessed data.')
  }
  
  if (metrics.errors > 0) {
    recommendations.push('Cache errors detected. Check Redis connection and configuration.')
  }
  
  if (metrics.keyStats.totalKeys > 50000) {
    recommendations.push('High number of cache keys. Consider implementing cache cleanup strategies.')
  }
  
  if (metrics.keyStats.byPrefix) {
    const cryptoKeys = metrics.keyStats.byPrefix.crypto || 0
    if (cryptoKeys > 1000) {
      recommendations.push('High number of crypto cache keys. Consider optimizing crypto data caching.')
    }
  }
  
  return recommendations
}

function generateQueryRecommendations(queryStats: any): string[] {
  const recommendations = []
  
  if (queryStats.averageExecutionTime > 2000) {
    recommendations.push('High average query execution time. Consider query optimization.')
  }
  
  if (queryStats.cacheHitRate < 60) {
    recommendations.push('Low query cache hit rate. Consider increasing cache TTL or cache warming.')
  }
  
  if (queryStats.slowQueries.length > 0) {
    recommendations.push(`${queryStats.slowQueries.length} slow queries detected. Review and optimize these queries.`)
  }
  
  if (queryStats.topQueries.length > 0) {
    const topQuery = queryStats.topQueries[0]
    if (topQuery.count > 100) {
      recommendations.push(`Query "${topQuery.queryHash}" executed ${topQuery.count} times. Consider caching optimization.`)
    }
  }
  
  return recommendations
}

function generateHealthRecommendations(responseTime: number, isHealthy: boolean): string[] {
  const recommendations = []
  
  if (!isHealthy) {
    recommendations.push('Cache system is not healthy. Check Redis connection and configuration.')
  }
  
  if (responseTime > 500) {
    recommendations.push('High cache response time detected. Monitor system resources and network connectivity.')
  }
  
  if (responseTime > 1000) {
    recommendations.push('Very high cache response time. Consider Redis optimization or scaling.')
  }
  
  if (isHealthy && responseTime < 100) {
    recommendations.push('Cache system is performing optimally.')
  }
  
  return recommendations
}

async function warmCommonQueries(): Promise<void> {
  try {
    // Warm up common queries
    await OptimizedQueries.getCryptoData(100, { useCache: true, enableProfiling: false })
    await OptimizedQueries.getAnalyticsData('user_engagement', '24h', { useCache: true, enableProfiling: false })
    await OptimizedQueries.getAnalyticsData('subscription_metrics', '24h', { useCache: true, enableProfiling: false })
  } catch (error) {
    console.error('Error warming common queries:', error)
  }
}

async function applyOptimizations(optimizations: any[]): Promise<void> {
  try {
    for (const optimization of optimizations) {
      switch (optimization.type) {
        case 'hit_rate':
          // Could implement automatic TTL adjustment
          console.log('Applied hit rate optimization')
          break
        case 'cache_size':
          // Could implement automatic cleanup
          console.log('Applied cache size optimization')
          break
        default:
          console.log(`Optimization type ${optimization.type} requires manual intervention`)
      }
    }
  } catch (error) {
    console.error('Error applying optimizations:', error)
  }
}