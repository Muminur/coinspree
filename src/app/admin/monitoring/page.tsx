'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, StatsCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface SystemHealthMetrics {
  timestamp: string
  api: {
    status: 'healthy' | 'degraded' | 'down'
    responseTime: number
    successRate: number
    requestsPerMinute: number
    errorRate: number
  }
  database: {
    status: 'healthy' | 'degraded' | 'down'
    connectionTime: number
    queryTime: number
    connections: number
  }
  emailService: {
    status: 'healthy' | 'degraded' | 'down'
    deliveryRate: number
    bounceRate: number
    emailsSent24h: number
    avgDeliveryTime: number
  }
  athDetection: {
    status: 'healthy' | 'degraded' | 'down'
    accuracy: number
    detections24h: number
    falsePositives: number
    averageDetectionTime: number
    lastCronRun: string
  }
  performance: {
    cpuUsage: number
    memoryUsage: number
    uptime: string
    pageLoadTime: number
    serverResponseTime: number
  }
  userEngagement: {
    activeUsers24h: number
    activeUsers7d: number
    sessionDuration: number
    bounceRate: number
    conversionRate: number
  }
  alerts: Array<{
    id: string
    level: 'info' | 'warning' | 'critical'
    message: string
    timestamp: string
    acknowledged: boolean
  }>
}

export default function MonitoringDashboard() {
  const [healthData, setHealthData] = useState<SystemHealthMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchHealthData()
    
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(fetchHealthData, 30000) // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const fetchHealthData = async () => {
    try {
      console.log('🔍 Monitoring: Fetching system health data')
      const response = await fetch('/api/admin/system-health', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const result = await response.json()
        setHealthData(result.data)
        setError(null)
        setLastUpdated(new Date())
        console.log('✅ Monitoring: Health data fetched successfully')
      } else {
        const errorData = await response.json()
        setError(`API Error: ${errorData.error}`)
        console.error('❌ Monitoring: API error:', errorData)
      }
    } catch (err) {
      setError(`Network Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      console.error('❌ Monitoring: Network error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'degraded': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'down': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅'
      case 'degraded': return '⚠️'
      case 'down': return '❌'
      default: return '❓'
    }
  }

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800'
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800'
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-800'
    }
  }

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical': return '🚨'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '📝'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Performance Monitoring</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🔧 Performance Monitoring</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time system health and performance metrics
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-600 hover:bg-gray-700 text-white'
            }
          >
            {autoRefresh ? '🔄 Auto-Refresh ON' : '⏸️ Auto-Refresh OFF'}
          </Button>
          <Button
            onClick={fetchHealthData}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            🔄 Refresh Now
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <span className="text-red-500 text-xl">❌</span>
            <div>
              <p className="text-red-700 dark:text-red-300 font-medium">Monitoring Error</p>
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">API Status</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-2xl">{getStatusIcon(healthData?.api.status || 'down')}</span>
                <Badge className={getStatusColor(healthData?.api.status || 'down')}>
                  {healthData?.api.status || 'Unknown'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {healthData?.api.responseTime || 0}ms
              </p>
              <p className="text-xs text-gray-500">Response Time</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Database</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-2xl">{getStatusIcon(healthData?.database.status || 'down')}</span>
                <Badge className={getStatusColor(healthData?.database.status || 'down')}>
                  {healthData?.database.status || 'Unknown'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {healthData?.database.connectionTime || 0}ms
              </p>
              <p className="text-xs text-gray-500">Query Time</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Email Service</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-2xl">{getStatusIcon(healthData?.emailService.status || 'down')}</span>
                <Badge className={getStatusColor(healthData?.emailService.status || 'down')}>
                  {healthData?.emailService.status || 'Unknown'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {healthData?.emailService.deliveryRate || 0}%
              </p>
              <p className="text-xs text-gray-500">Delivery Rate</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">ATH Detection</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-2xl">{getStatusIcon(healthData?.athDetection.status || 'down')}</span>
                <Badge className={getStatusColor(healthData?.athDetection.status || 'down')}>
                  {healthData?.athDetection.status || 'Unknown'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {healthData?.athDetection.accuracy || 0}%
              </p>
              <p className="text-xs text-gray-500">Accuracy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatsCard
          title="Server Response"
          value={`${healthData?.performance.serverResponseTime || 0}ms`}
          icon="⚡"
          description="Real-time response"
        />
        <StatsCard
          title="Page Load Time"
          value={`${healthData?.performance.pageLoadTime || 0}s`}
          icon="📄"
          description="Average load time"
        />
        <StatsCard
          title="System Uptime"
          value={healthData?.performance.uptime || '0%'}
          icon="🕐"
          description="Current session"
        />
        <StatsCard
          title="CPU Usage"
          value={`${healthData?.performance.cpuUsage || 0}%`}
          icon="🔧"
          description="Current utilization"
        />
        <StatsCard
          title="Memory Usage"
          value={`${healthData?.performance.memoryUsage || 0}%`}
          icon="💾"
          description="RAM utilization"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Engagement Metrics */}
        <Card>
          <CardHeader
            title="📊 User Engagement Analytics"
            description="Real-time user activity and conversion metrics"
          />
          <div className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {healthData?.userEngagement.activeUsers24h || 0}
                </div>
                <div className="text-sm text-blue-500 dark:text-blue-300">Active Users (24h)</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {healthData?.userEngagement.activeUsers7d || 0}
                </div>
                <div className="text-sm text-green-500 dark:text-green-300">Active Users (7d)</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Session Duration</span>
                <span className="font-medium">{healthData?.userEngagement.sessionDuration || 0} min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Bounce Rate</span>
                <span className="font-medium">{healthData?.userEngagement.bounceRate || 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</span>
                <span className="font-medium text-green-600">{healthData?.userEngagement.conversionRate || 0}%</span>
              </div>
            </div>
          </div>
        </Card>

        {/* ATH Detection Analytics */}
        <Card>
          <CardHeader
            title="🚀 ATH Detection Performance"
            description="All-Time High detection system metrics"
          />
          <div className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {healthData?.athDetection.detections24h || 0}
                </div>
                <div className="text-sm text-green-500 dark:text-green-300">Detections (24h)</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {healthData?.athDetection.falsePositives || 0}
                </div>
                <div className="text-sm text-red-500 dark:text-red-300">False Positives</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Detection Accuracy</span>
                <span className="font-medium text-green-600">{healthData?.athDetection.accuracy || 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Avg Detection Time</span>
                <span className="font-medium">{healthData?.athDetection.averageDetectionTime || 0}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Last Cron Run</span>
                <span className="font-medium text-xs">
                  {healthData?.athDetection.lastCronRun ? 
                    new Date(healthData.athDetection.lastCronRun).toLocaleTimeString() : 
                    'Unknown'
                  }
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Email Service Analytics */}
      <Card>
        <CardHeader
          title="📧 Email Service Performance"
          description="Email delivery metrics and service health"
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {healthData?.emailService.deliveryRate || 0}%
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Delivery Rate</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Last 24 hours</p>
          </div>
          
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {healthData?.emailService.bounceRate || 0}%
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Bounce Rate</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Email bounces</p>
          </div>
          
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {healthData?.emailService.emailsSent24h || 0}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Emails Sent</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Last 24 hours</p>
          </div>
          
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {healthData?.emailService.avgDeliveryTime || 0}s
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Avg Delivery</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Delivery time</p>
          </div>
        </div>
      </Card>

      {/* System Alerts */}
      <Card>
        <CardHeader
          title="🚨 System Alerts"
          description="Active alerts and system notifications"
        />
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {healthData?.alerts && healthData.alerts.length > 0 ? (
            healthData.alerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border ${getAlertColor(alert.level)}`}>
                <div className="flex items-start space-x-3">
                  <span className="text-xl">{getAlertIcon(alert.level)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <Badge className={`${alert.level === 'critical' ? 'bg-red-500' : alert.level === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'} text-white`}>
                        {alert.level.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <span className="text-2xl mb-2 block">✅</span>
              No active alerts - all systems operational
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}