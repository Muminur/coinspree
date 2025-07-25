'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface EmailAnalytics {
  timestamp: string
  deliveryMetrics: {
    totalSent: number
    totalDelivered: number
    totalFailed: number
    deliveryRate: number
    bounceRate: number
    failureRate: number
  }
  performanceMetrics: {
    averageDeliveryTime: number
    avgSendTime: number
    quickestDelivery: number
    slowestDelivery: number
  }
  volumeMetrics: {
    emailsSent24h: number
    emailsSent7d: number
    emailsSent30d: number
    peakSendingHour: number
    avgEmailsPerHour: number
  }
  typeBreakdown: {
    athNotifications: number
    welcomeEmails: number
    subscriptionExpiry: number
    passwordReset: number
    other: number
  }
  errorAnalysis: {
    commonErrors: Array<{
      error: string
      count: number
      percentage: number
    }>
    errorsByType: Record<string, number>
    criticalErrors: number
  }
  trends: {
    dailyVolume: Array<{
      date: string
      sent: number
      delivered: number
      failed: number
      deliveryRate: number
    }>
    hourlyPattern: Array<{
      hour: number
      volume: number
    }>
  }
}

export default function EmailAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState('7d')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/email-analytics?timeframe=${timeframe}&details=true`, {
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
        setError(data.error || 'Failed to fetch email analytics')
      }
    } catch (err) {
      console.error('Email analytics fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeframe])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchAnalytics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [autoRefresh, timeframe])

  const getStatusBadge = (rate: number, type: 'delivery' | 'error') => {
    if (type === 'delivery') {
      if (rate >= 95) return <Badge variant="success">Excellent</Badge>
      if (rate >= 90) return <Badge variant="warning">Good</Badge>
      return <Badge variant="danger">Poor</Badge>
    } else {
      if (rate <= 2) return <Badge variant="success">Low</Badge>
      if (rate <= 5) return <Badge variant="warning">Medium</Badge>
      return <Badge variant="danger">High</Badge>
    }
  }

  const formatHour = (hour: number) => {
    return hour === 0 ? '12 AM' : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`
  }

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading email analytics...</span>
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
            No email analytics data available
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📧 Email Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor email delivery performance and analytics
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Timeframe Selector */}
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
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

      {/* Last Updated */}
      <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
        Last updated: {new Date(analytics.timestamp).toLocaleString()}
      </div>

      {/* Delivery Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-400">Delivery Rate</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-300">
                  {analytics.deliveryMetrics.deliveryRate.toFixed(1)}%
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
            <div className="mt-4">
              {getStatusBadge(analytics.deliveryMetrics.deliveryRate, 'delivery')}
              <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                {analytics.deliveryMetrics.totalDelivered} of {analytics.deliveryMetrics.totalSent} sent
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-400">Failure Rate</p>
                <p className="text-3xl font-bold text-red-900 dark:text-red-300">
                  {analytics.deliveryMetrics.failureRate.toFixed(1)}%
                </p>
              </div>
              <div className="text-4xl">❌</div>
            </div>
            <div className="mt-4">
              {getStatusBadge(analytics.deliveryMetrics.failureRate, 'error')}
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                {analytics.deliveryMetrics.totalFailed} failed emails
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-400">Avg Delivery Time</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">
                  {analytics.performanceMetrics.averageDeliveryTime.toFixed(1)}s
                </p>
              </div>
              <div className="text-4xl">⚡</div>
            </div>
            <div className="mt-4">
              <Badge variant="info">Performance</Badge>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                {analytics.performanceMetrics.avgSendTime}s avg send time
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Volume Metrics */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">📊</span>
            Email Volume Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {analytics.volumeMetrics.emailsSent24h.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last 24 Hours</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {analytics.volumeMetrics.emailsSent7d.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last 7 Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {analytics.volumeMetrics.emailsSent30d.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last 30 Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatHour(analytics.volumeMetrics.peakSendingHour)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Peak Hour</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Email Type Breakdown */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">📨</span>
            Email Type Breakdown
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {analytics.typeBreakdown.athNotifications}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">🚀 ATH Notifications</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {analytics.typeBreakdown.welcomeEmails}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">👋 Welcome</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {analytics.typeBreakdown.subscriptionExpiry}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">⚠️ Expiry</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {analytics.typeBreakdown.passwordReset}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">🔐 Password Reset</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {analytics.typeBreakdown.other}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">📧 Other</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Error Analysis */}
      {analytics.errorAnalysis.commonErrors.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">🚨</span>
              Error Analysis
              <Badge variant="danger" className="ml-2">
                {analytics.errorAnalysis.criticalErrors} Critical
              </Badge>
            </h3>
            <div className="space-y-3">
              {analytics.errorAnalysis.commonErrors.slice(0, 5).map((error, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-400 truncate">
                      {error.error}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="danger">{error.count} occurrences</Badge>
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {error.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Daily Trends */}
      {analytics.trends.dailyVolume.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">📈</span>
              Daily Email Trends
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Sent</th>
                    <th className="text-right p-3">Delivered</th>
                    <th className="text-right p-3">Failed</th>
                    <th className="text-right p-3">Delivery Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.trends.dailyVolume.slice(-7).map((day, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-3 font-medium">{day.date}</td>
                      <td className="p-3 text-right">{day.sent}</td>
                      <td className="p-3 text-right text-green-600">{day.delivered}</td>
                      <td className="p-3 text-right text-red-600">{day.failed}</td>
                      <td className="p-3 text-right">
                        <span className={`font-medium ${day.deliveryRate >= 95 ? 'text-green-600' : day.deliveryRate >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {day.deliveryRate.toFixed(1)}%
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