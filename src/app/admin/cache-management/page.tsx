'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface CacheMetrics {
  hits: number
  misses: number
  sets: number
  deletes: number
  errors: number
  totalRequests: number
  hitRate: number
  lastUpdated: string
  keyStats: {
    totalKeys: number
    byPrefix: Record<string, number>
  }
}

interface QueryStats {
  totalQueries: number
  averageExecutionTime: number
  cacheHitRate: number
  slowQueries: Array<{
    query: string
    executionTime: number
    cacheHit: boolean
    resultSize: number
    timestamp: string
    optimized: boolean
  }>
  topQueries: Array<{
    queryHash: string
    count: number
    averageTime: number
    lastExecuted: string
  }>
}

interface CacheHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  operations: {
    set: { success: boolean; responseTime: number }
    get: { success: boolean; responseTime: number }
    delete: { success: boolean; responseTime: number }
  }
  totalResponseTime: number
  timestamp: string
  recommendations: string[]
  error?: string
}

export default function CacheManagementDashboard() {
  const [cacheData, setCacheData] = useState<{
    cacheMetrics: CacheMetrics
    performance: any
    keyDistribution: Record<string, number>
    recommendations: string[]
  } | null>(null)
  
  const [queryData, setQueryData] = useState<{
    queryPerformance: QueryStats
    optimization: any
    recommendations: string[]
  } | null>(null)
  
  const [healthData, setHealthData] = useState<CacheHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'queries' | 'health' | 'management'>('overview')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchCacheStats = async () => {
    try {
      const response = await fetch('/api/admin/cache-management?action=stats', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cache stats: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        setCacheData(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch cache stats')
      }
    } catch (err) {
      console.error('Cache stats fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }

  const fetchQueryStats = async () => {
    try {
      const response = await fetch('/api/admin/cache-management?action=queries', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch query stats: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        setQueryData(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch query stats')
      }
    } catch (err) {
      console.error('Query stats fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/admin/cache-management?action=health', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch health data: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        setHealthData(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch health data')
      }
    } catch (err) {
      console.error('Health data fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }

  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      await Promise.all([
        fetchCacheStats(),
        fetchQueryStats(),
        fetchHealthData()
      ])
    } catch (err) {
      console.error('Data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const performAction = async (action: string, options: any = {}) => {
    try {
      setActionLoading(action)
      
      const response = await fetch('/api/admin/cache-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, options })
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log(`${action} completed:`, data.message)
        // Refresh data after action
        await fetchAllData()
      } else {
        console.error(`${action} failed:`, data.error)
      }
    } catch (err) {
      console.error(`${action} error:`, err)
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  const getHealthStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="success">✅ Healthy</Badge>
      case 'degraded':
        return <Badge variant="warning">⚠️ Degraded</Badge>
      case 'unhealthy':
        return <Badge variant="danger">❌ Unhealthy</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Byte'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading && !cacheData && !queryData && !healthData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading cache management data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <div className="p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">❌</span>
              <div>
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-400">Error Loading Cache Data</h3>
                <p className="text-red-600 dark:text-red-300">{error}</p>
              </div>
            </div>
            <Button onClick={fetchAllData} className="mt-4" variant="outline">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            🚀 Cache & Query Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor and optimize cache performance and database queries
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={fetchAllData} variant="outline" size="sm" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : '🔄 Refresh'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'overview', label: '📊 Overview', },
          { key: 'queries', label: '🔍 Query Performance' },
          { key: 'health', label: '❤️ Health Check' },
          { key: 'management', label: '⚙️ Management' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && cacheData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-400">Cache Hit Rate</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">
                      {cacheData.cacheMetrics.hitRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-4xl">🎯</div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-400">Total Requests</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-300">
                      {cacheData.cacheMetrics.totalRequests.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-4xl">📈</div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-800 dark:text-purple-400">Cached Keys</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-300">
                      {cacheData.cacheMetrics.keyStats.totalKeys.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-4xl">🔑</div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-400">Error Rate</p>
                    <p className="text-3xl font-bold text-orange-900 dark:text-orange-300">
                      {cacheData.performance.errorRate.toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-4xl">⚠️</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Cache Operations Stats */}
          <Card>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">📊</span>
                Cache Operations
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-2xl font-bold text-blue-600">{cacheData.cacheMetrics.hits.toLocaleString()}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Cache Hits</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-3xl mb-2">❌</div>
                  <p className="text-2xl font-bold text-red-600">{cacheData.cacheMetrics.misses.toLocaleString()}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Cache Misses</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-3xl mb-2">📝</div>
                  <p className="text-2xl font-bold text-green-600">{cacheData.cacheMetrics.sets.toLocaleString()}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Cache Sets</p>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-3xl mb-2">🗑️</div>
                  <p className="text-2xl font-bold text-orange-600">{cacheData.cacheMetrics.deletes.toLocaleString()}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Cache Deletes</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Key Distribution */}
          <Card>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">🔑</span>
                Cache Key Distribution
              </h3>
              <div className="space-y-3">
                {Object.entries(cacheData.keyDistribution).map(([prefix, count]) => (
                  <div key={prefix} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {prefix === 'crypto' ? '₿' : prefix === 'user' ? '👤' : prefix === 'analytics' ? '📊' : '📁'}
                      </span>
                      <span className="font-medium capitalize">{prefix}</span>
                    </div>
                    <Badge variant="info">{count} keys</Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Recommendations */}
          {cacheData.recommendations.length > 0 && (
            <Card>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="text-2xl mr-2">💡</span>
                  Optimization Recommendations
                </h3>
                <div className="space-y-2">
                  {cacheData.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-400">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Query Performance Tab */}
      {activeTab === 'queries' && queryData && (
        <>
          {/* Query Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-800 dark:text-indigo-400">Total Queries</p>
                    <p className="text-3xl font-bold text-indigo-900 dark:text-indigo-300">
                      {queryData.queryPerformance.totalQueries.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-4xl">🔍</div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 border-cyan-200 dark:border-cyan-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-cyan-800 dark:text-cyan-400">Avg Response Time</p>
                    <p className="text-3xl font-bold text-cyan-900 dark:text-cyan-300">
                      {formatTime(queryData.queryPerformance.averageExecutionTime)}
                    </p>
                  </div>
                  <div className="text-4xl">⚡</div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 border-teal-200 dark:border-teal-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-teal-800 dark:text-teal-400">Query Cache Hit Rate</p>
                    <p className="text-3xl font-bold text-teal-900 dark:text-teal-300">
                      {queryData.queryPerformance.cacheHitRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-4xl">🎯</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Slow Queries */}
          {queryData.queryPerformance.slowQueries.length > 0 && (
            <Card>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="text-2xl mr-2">🐌</span>
                  Slow Queries ({queryData.queryPerformance.slowQueries.length})
                </h3>
                <div className="space-y-3">
                  {queryData.queryPerformance.slowQueries.map((query, index) => (
                    <div key={index} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                            {query.query}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>Execution Time: {formatTime(query.executionTime)}</span>
                            <span>Result Size: {formatBytes(query.resultSize)}</span>
                            <span>Cache Hit: {query.cacheHit ? '✅' : '❌'}</span>
                          </div>
                        </div>
                        <Badge variant={query.optimized ? "success" : "danger"}>
                          {query.optimized ? 'Optimized' : 'Needs Optimization'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Top Queries */}
          <Card>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">🔥</span>
                Most Frequent Queries
              </h3>
              <div className="space-y-3">
                {queryData.queryPerformance.topQueries.map((query, index) => (
                  <div key={index} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          Query #{query.queryHash.substring(0, 8)}...
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>Count: {query.count}</span>
                          <span>Avg Time: {formatTime(query.averageTime)}</span>
                          <span>Last: {new Date(query.lastExecuted).toLocaleString()}</span>
                        </div>
                      </div>
                      <Badge variant="info">{query.count} executions</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Health Check Tab */}
      {activeTab === 'health' && healthData && (
        <>
          {/* Health Status */}
          <Card>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">❤️</span>
                Cache System Health
              </h3>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overall Status</p>
                  {getHealthStatusBadge(healthData.status)}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Response Time</p>
                  <p className="text-lg font-semibold">{formatTime(healthData.totalResponseTime)}</p>
                </div>
              </div>
              
              {healthData.error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400 mb-4">
                  <p className="text-sm text-red-800 dark:text-red-200">{healthData.error}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Operation Performance */}
          <Card>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">⚡</span>
                Operation Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(healthData.operations).map(([operation, data]) => (
                  <div key={operation} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-3xl mb-2">
                      {operation === 'set' ? '📝' : operation === 'get' ? '📖' : '🗑️'}
                    </div>
                    <p className="text-lg font-bold capitalize mb-1">{operation}</p>
                    <p className={`text-sm mb-2 ${data.success ? 'text-green-600' : 'text-red-600'}`}>
                      {data.success ? '✅ Success' : '❌ Failed'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatTime(data.responseTime)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Health Recommendations */}
          {healthData.recommendations.length > 0 && (
            <Card>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="text-2xl mr-2">🔧</span>
                  Health Recommendations
                </h3>
                <div className="space-y-2">
                  {healthData.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-400">
                      <p className="text-sm text-blue-800 dark:text-blue-200">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Management Tab */}
      {activeTab === 'management' && (
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">⚙️</span>
              Cache Management Operations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cache Operations */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Cache Operations</h4>
                
                <Button
                  onClick={() => performAction('clear')}
                  variant="danger"
                  disabled={actionLoading === 'clear'}
                  className="w-full"
                >
                  {actionLoading === 'clear' ? <LoadingSpinner size="sm" /> : '🗑️ Clear All Cache'}
                </Button>
                
                <Button
                  onClick={() => performAction('warm')}
                  variant="primary"
                  disabled={actionLoading === 'warm'}
                  className="w-full"
                >
                  {actionLoading === 'warm' ? <LoadingSpinner size="sm" /> : '🔥 Warm Up Cache'}
                </Button>
                
                <Button
                  onClick={() => performAction('invalidate', { patterns: ['cache:crypto:*'] })}
                  variant="warning"
                  disabled={actionLoading === 'invalidate'}
                  className="w-full"
                >
                  {actionLoading === 'invalidate' ? <LoadingSpinner size="sm" /> : '🔄 Invalidate Crypto Cache'}
                </Button>
              </div>
              
              {/* Optimization Operations */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Optimization</h4>
                
                <Button
                  onClick={() => performAction('optimize')}
                  variant="info"
                  disabled={actionLoading === 'optimize'}
                  className="w-full"
                >
                  {actionLoading === 'optimize' ? <LoadingSpinner size="sm" /> : '🔍 Analyze Performance'}
                </Button>
                
                <Button
                  onClick={() => performAction('optimize', { autoApply: true })}
                  variant="success"
                  disabled={actionLoading === 'optimize'}
                  className="w-full"
                >
                  {actionLoading === 'optimize' ? <LoadingSpinner size="sm" /> : '🚀 Auto-Optimize'}
                </Button>
                
                <Button
                  onClick={() => performAction('clear', { clearQueryStats: true })}
                  variant="outline"
                  disabled={actionLoading === 'clear'}
                  className="w-full"
                >
                  {actionLoading === 'clear' ? <LoadingSpinner size="sm" /> : '📊 Reset Query Stats'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}