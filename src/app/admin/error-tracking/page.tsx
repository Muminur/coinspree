'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface ErrorLog {
  id: string
  timestamp: string
  level: 'critical' | 'error' | 'warning' | 'info'
  category: 'auth' | 'payment' | 'email' | 'api' | 'database' | 'crypto' | 'system' | 'user'
  message: string
  stack?: string
  userId?: string
  userEmail?: string
  endpoint?: string
  method?: string
  statusCode?: number
  userAgent?: string
  ip?: string
  metadata?: Record<string, any>
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: string
  resolveNotes?: string
  occurrenceCount: number
  firstOccurrence: string
  lastOccurrence: string
}

interface ErrorAnalytics {
  timestamp: string
  summary: {
    totalErrors: number
    criticalErrors: number
    unresolvedErrors: number
    errorRate24h: number
    topErrorCategories: Array<{ category: string; count: number; percentage: number }>
  }
  recentErrors: ErrorLog[]
  errorTrends: {
    hourlyErrors: Array<{ hour: number; count: number; criticalCount: number }>
    dailyErrors: Array<{ date: string; count: number; criticalCount: number; resolved: number }>
    categoryBreakdown: Record<string, number>
    levelBreakdown: Record<string, number>
  }
  topErrors: Array<{
    message: string
    category: string
    level: string
    count: number
    lastOccurrence: string
    resolved: boolean
  }>
  systemHealth: {
    errorFrequency: number
    criticalErrorFrequency: number
    averageResolutionTime: number
    healthScore: number
  }
}

export default function ErrorTrackingDashboard() {
  const [analytics, setAnalytics] = useState<ErrorAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    timeframe: '24h',
    category: 'all',
    level: 'all',
    resolved: 'all'
  })
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null)
  const [resolvingError, setResolvingError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        timeframe: filters.timeframe,
        category: filters.category,
        level: filters.level,
        resolved: filters.resolved,
        limit: '100'
      })
      
      const response = await fetch(`/api/admin/error-tracking?${params}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        setAnalytics(data.data)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch error analytics')
      }
    } catch (err) {
      console.error('Error analytics fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resolveError = async (errorId: string, resolved: boolean, notes?: string) => {
    try {
      setResolvingError(errorId)
      const response = await fetch('/api/admin/error-tracking', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          errorId,
          resolved,
          resolveNotes: notes
        })
      })
      
      if (response.ok) {
        await fetchAnalytics() // Refresh data
        setSelectedError(null)
      } else {
        console.error('Failed to update error status')
      }
    } catch (err) {
      console.error('Error updating status:', err)
    } finally {
      setResolvingError(null)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [filters])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchAnalytics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [autoRefresh, filters])

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <Badge variant="danger">🚨 Critical</Badge>
      case 'error':
        return <Badge variant="danger">❌ Error</Badge>
      case 'warning':
        return <Badge variant="warning">⚠️ Warning</Badge>
      case 'info':
        return <Badge variant="info">ℹ️ Info</Badge>
      default:
        return <Badge variant="secondary">{level}</Badge>
    }
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      auth: '🔐',
      payment: '💳',
      email: '📧',
      api: '🔌',
      database: '🗄️',
      crypto: '🪙',
      system: '⚙️',
      user: '👤'
    }
    return icons[category] || '📝'
  }

  const getHealthBadge = (score: number) => {
    if (score >= 90) return <Badge variant="success">Excellent ({score}%)</Badge>
    if (score >= 70) return <Badge variant="warning">Good ({score}%)</Badge>
    if (score >= 50) return <Badge variant="warning">Fair ({score}%)</Badge>
    return <Badge variant="danger">Poor ({score}%)</Badge>
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading error analytics...</span>
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
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-400">Error Loading Analytics</h3>
                <p className="text-red-600 dark:text-red-300">{error}</p>
              </div>
            </div>
            <Button onClick={fetchAnalytics} className="mt-4" variant="outline">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No error analytics data available
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            🐛 Error Tracking Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor system errors, bugs, and resolution tracking
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Auto Refresh Toggle */}
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "primary" : "outline"}
            size="sm"
          >
            {autoRefresh ? '🔄 Auto Refresh' : '⏸️ Manual'}
          </Button>
          
          {/* Manual Refresh */}
          <Button onClick={fetchAnalytics} variant="outline" size="sm" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : '🔄 Refresh'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Timeframe
              </label>
              <select 
                value={filters.timeframe} 
                onChange={(e) => setFilters({...filters, timeframe: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select 
                value={filters.category} 
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm"
              >
                <option value="all">All Categories</option>
                <option value="auth">🔐 Authentication</option>
                <option value="payment">💳 Payment</option>
                <option value="email">📧 Email</option>
                <option value="api">🔌 API</option>
                <option value="database">🗄️ Database</option>
                <option value="crypto">🪙 Crypto</option>
                <option value="system">⚙️ System</option>
                <option value="user">👤 User</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Level
              </label>
              <select 
                value={filters.level} 
                onChange={(e) => setFilters({...filters, level: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm"
              >
                <option value="all">All Levels</option>
                <option value="critical">🚨 Critical</option>
                <option value="error">❌ Error</option>
                <option value="warning">⚠️ Warning</option>
                <option value="info">ℹ️ Info</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select 
                value={filters.resolved} 
                onChange={(e) => setFilters({...filters, resolved: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm"
              >
                <option value="all">All Status</option>
                <option value="false">🔴 Unresolved</option>
                <option value="true">✅ Resolved</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Last Updated */}
      <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
        Last updated: {new Date(analytics.timestamp).toLocaleString()}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-400">Total Errors</p>
                <p className="text-3xl font-bold text-red-900 dark:text-red-300">
                  {analytics.summary.totalErrors.toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">🚨</div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-red-700 dark:text-red-400">
                {analytics.summary.errorRate24h.toFixed(1)} errors/hour (24h)
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800 dark:text-orange-400">Critical Errors</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-300">
                  {analytics.summary.criticalErrors}
                </p>
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
            <div className="mt-4">
              <Badge variant="danger">
                {analytics.systemHealth.criticalErrorFrequency.toFixed(1)}/hour
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Unresolved</p>
                <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-300">
                  {analytics.summary.unresolvedErrors}
                </p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                Avg resolution: {analytics.systemHealth.averageResolutionTime.toFixed(1)}h
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-400">System Health</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-300">
                  {analytics.systemHealth.healthScore}%
                </p>
              </div>
              <div className="text-4xl">💚</div>
            </div>
            <div className="mt-4">
              {getHealthBadge(analytics.systemHealth.healthScore)}
            </div>
          </div>
        </Card>
      </div>

      {/* Top Error Categories */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">📊</span>
            Top Error Categories
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {analytics.summary.topErrorCategories.map((category, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl mb-2">{getCategoryIcon(category.category)}</div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                  {category.category}
                </p>
                <p className="text-lg font-bold text-red-600">{category.count}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {category.percentage.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Top Errors */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">🔝</span>
            Most Frequent Errors
          </h3>
          <div className="space-y-3">
            {analytics.topErrors.slice(0, 10).map((topError, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getLevelBadge(topError.level)}
                      <Badge variant={topError.resolved ? "success" : "danger"}>
                        {topError.resolved ? "✅ Resolved" : "🔴 Open"}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {getCategoryIcon(topError.category)} {topError.category}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {topError.message.length > 100 ? `${topError.message.substring(0, 100)}...` : topError.message}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Last occurrence: {formatTimeAgo(topError.lastOccurrence)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{topError.count}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">occurrences</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Recent Errors */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">🕐</span>
            Recent Errors ({analytics.recentErrors.length})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {analytics.recentErrors.map((errorLog, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-red-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getLevelBadge(errorLog.level)}
                      <Badge variant={errorLog.resolved ? "success" : "danger"}>
                        {errorLog.resolved ? "✅ Resolved" : "🔴 Open"}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {getCategoryIcon(errorLog.category)} {errorLog.category}
                      </span>
                      {errorLog.occurrenceCount > 1 && (
                        <Badge variant="warning">{errorLog.occurrenceCount}x</Badge>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {errorLog.message.length > 120 ? `${errorLog.message.substring(0, 120)}...` : errorLog.message}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>{formatTimeAgo(errorLog.timestamp)}</span>
                      {errorLog.endpoint && <span>📍 {errorLog.endpoint}</span>}
                      {errorLog.userEmail && <span>👤 {errorLog.userEmail}</span>}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setSelectedError(errorLog)}
                      variant="outline"
                      size="sm"
                    >
                      View Details
                    </Button>
                    {!errorLog.resolved && (
                      <Button
                        onClick={() => resolveError(errorLog.id, true, 'Marked as resolved')}
                        variant="primary"
                        size="sm"
                        disabled={resolvingError === errorLog.id}
                      >
                        {resolvingError === errorLog.id ? <LoadingSpinner size="sm" /> : 'Resolve'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

    {/* Error Detail Modal */}
    {selectedError && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-96 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Error Details</h3>
              <Button onClick={() => setSelectedError(null)} variant="outline" size="sm">
                ✕ Close
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {getLevelBadge(selectedError.level)}
                <Badge variant={selectedError.resolved ? "success" : "danger"}>
                  {selectedError.resolved ? "✅ Resolved" : "🔴 Open"}
                </Badge>
                <span className="text-sm text-gray-500">
                  {getCategoryIcon(selectedError.category)} {selectedError.category}
                </span>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Message</h4>
                <p className="text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 p-3 rounded">
                  {selectedError.message}
                </p>
              </div>
              
              {selectedError.stack && (
                <div>
                  <h4 className="font-medium mb-2">Stack Trace</h4>
                  <pre className="text-xs text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-x-auto">
                    {selectedError.stack}
                  </pre>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Occurrence Details</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Count:</strong> {selectedError.occurrenceCount}</p>
                    <p><strong>First:</strong> {new Date(selectedError.firstOccurrence).toLocaleString()}</p>
                    <p><strong>Latest:</strong> {new Date(selectedError.lastOccurrence).toLocaleString()}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Context</h4>
                  <div className="text-sm space-y-1">
                    {selectedError.endpoint && <p><strong>Endpoint:</strong> {selectedError.endpoint}</p>}
                    {selectedError.method && <p><strong>Method:</strong> {selectedError.method}</p>}
                    {selectedError.statusCode && <p><strong>Status:</strong> {selectedError.statusCode}</p>}
                    {selectedError.userEmail && <p><strong>User:</strong> {selectedError.userEmail}</p>}
                  </div>
                </div>
              </div>
              
              {selectedError.resolved && (
                <div>
                  <h4 className="font-medium mb-2">Resolution</h4>
                  <div className="text-sm">
                    <p><strong>Resolved by:</strong> {selectedError.resolvedBy}</p>
                    <p><strong>Resolved at:</strong> {selectedError.resolvedAt ? new Date(selectedError.resolvedAt).toLocaleString() : 'N/A'}</p>
                    {selectedError.resolveNotes && <p><strong>Notes:</strong> {selectedError.resolveNotes}</p>}
                  </div>
                </div>
              )}
              
              {!selectedError.resolved && (
                <div className="flex space-x-2">
                  <Button
                    onClick={() => resolveError(selectedError.id, true, 'Resolved via detail view')}
                    variant="primary"
                    disabled={resolvingError === selectedError.id}
                  >
                    {resolvingError === selectedError.id ? <LoadingSpinner size="sm" /> : 'Mark as Resolved'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Daily Error Trends */}
      {analytics.errorTrends.dailyErrors.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">📈</span>
              Daily Error Trends (Last 7 Days)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Total Errors</th>
                    <th className="text-right p-3">Critical</th>
                    <th className="text-right p-3">Resolved</th>
                    <th className="text-right p-3">Resolution Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.errorTrends.dailyErrors.map((day, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-3 font-medium">{day.date}</td>
                      <td className="p-3 text-right text-red-600 font-medium">{day.count}</td>
                      <td className="p-3 text-right text-orange-600 font-medium">{day.criticalCount}</td>
                      <td className="p-3 text-right text-green-600 font-medium">{day.resolved}</td>
                      <td className="p-3 text-right">
                        <span className={`font-medium ${
                          day.count > 0 && (day.resolved / day.count) >= 0.8 ? 'text-green-600' : 
                          day.count > 0 && (day.resolved / day.count) >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {day.count > 0 ? `${Math.round((day.resolved / day.count) * 100)}%` : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}