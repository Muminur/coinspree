'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface PerformanceAlert {
  id: string
  type: 'warning' | 'critical' | 'error'  
  category: 'api' | 'database' | 'email' | 'system' | 'athDetection'
  title: string
  description: string
  metric: string
  threshold: number
  currentValue: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'acknowledged' | 'resolved'
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  acknowledgedBy?: string
  metadata?: Record<string, any>
}

interface BottleneckDetection {
  endpoint: string
  averageResponseTime: number
  slowQueries: Array<{
    query: string
    executionTime: number
    timestamp: string
  }>
  memoryLeaks: Array<{
    component: string
    memoryUsage: number
    trend: 'increasing' | 'stable' | 'decreasing'
  }>
  resourceUsage: {
    cpu: number
    memory: number
    database: number
    external: number
  }
}

interface AlertsData {
  alerts: PerformanceAlert[]
  stats: {
    total: number
    active: number
    critical: number
    byCategory: Record<string, number>
  }
  timestamp: string
}

interface BottlenecksData {
  bottlenecks: {
    api: BottleneckDetection[]
    database: BottleneckDetection[]
    system: BottleneckDetection[]
    email: BottleneckDetection[]
  }
  alertsGenerated: number
  timestamp: string
}

export default function PerformanceAlertsDashboard() {
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null)
  const [bottlenecksData, setBottlenecksData] = useState<BottlenecksData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [activeTab, setActiveTab] = useState<'alerts' | 'bottlenecks' | 'thresholds'>('alerts')
  const [selectedAlert, setSelectedAlert] = useState<PerformanceAlert | null>(null)
  const [updatingAlert, setUpdatingAlert] = useState<string | null>(null)

  const fetchAlertsData = async () => {
    try {
      const response = await fetch('/api/admin/performance-alerts?action=alerts', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        setAlertsData(data.data)
      } else {
        setError(data.error || 'Failed to fetch alerts')
      }
    } catch (err) {
      console.error('Alerts fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }

  const fetchBottlenecksData = async () => {
    try {
      const response = await fetch('/api/admin/performance-alerts?action=bottlenecks', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch bottlenecks: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        setBottlenecksData(data.data)
      } else {
        setError(data.error || 'Failed to fetch bottlenecks')
      }
    } catch (err) {
      console.error('Bottlenecks fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      await Promise.all([
        fetchAlertsData(),
        fetchBottlenecksData()
      ])
    } catch (err) {
      console.error('Data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateAlert = async (alertId: string, action: 'acknowledge' | 'resolve', updates?: any) => {
    try {
      setUpdatingAlert(alertId)
      const response = await fetch('/api/admin/performance-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          alertId,
          updates
        })
      })
      
      if (response.ok) {
        await fetchAlertsData() // Refresh data
        setSelectedAlert(null)
      } else {
        console.error('Failed to update alert')
      }
    } catch (err) {
      console.error('Error updating alert:', err)
    } finally {
      setUpdatingAlert(null)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [autoRefresh])

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="danger">🚨 Critical</Badge>
      case 'high':
        return <Badge variant="warning">🔴 High</Badge>
      case 'medium':
        return <Badge variant="info">🟡 Medium</Badge>
      default:
        return <Badge variant="secondary">⚪ Low</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="danger">🔴 Active</Badge>
      case 'acknowledged':
        return <Badge variant="warning">👀 Acknowledged</Badge>
      case 'resolved':
        return <Badge variant="success">✅ Resolved</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getCategoryBadge = (category: string) => {
    const badges = {
      api: <Badge variant="info">🔗 API</Badge>,
      database: <Badge variant="warning">🗄️ Database</Badge>,
      email: <Badge variant="info">📧 Email</Badge>,
      system: <Badge variant="danger">💻 System</Badge>,
      athDetection: <Badge variant="warning">📈 ATH Detection</Badge>
    }
    return badges[category as keyof typeof badges] || <Badge variant="secondary">{category}</Badge>
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

  const ResourceUsageBar = ({ label, value, threshold = 80 }: { label: string, value: number, threshold?: number }) => {
    const getColor = () => {
      if (value >= threshold) return 'bg-red-500'
      if (value >= threshold * 0.8) return 'bg-yellow-500'
      return 'bg-green-500'
    }

    return (
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span>{label}</span>
          <span>{value.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getColor()}`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
      </div>
    )
  }

  if (loading && !alertsData && !bottlenecksData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading performance alerts...</span>
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
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-400">Error Loading Performance Data</h3>
                <p className="text-red-600 dark:text-red-300">{error}</p>
              </div>
            </div>
            <Button onClick={fetchData} className="mt-4" variant="outline">
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            🚨 Performance Alerts & Bottlenecks
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor system performance issues and detect bottlenecks
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
          <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : '🔄 Refresh'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'alerts'
              ? 'border-red-500 text-red-600 dark:text-red-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          🚨 Active Alerts ({alertsData?.stats.active || 0})
        </button>
        <button
          onClick={() => setActiveTab('bottlenecks')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'bottlenecks'
              ? 'border-red-500 text-red-600 dark:text-red-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          🔍 Bottleneck Analysis
        </button>
        <button
          onClick={() => setActiveTab('thresholds')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'thresholds'
              ? 'border-red-500 text-red-600 dark:text-red-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          ⚙️ Thresholds
        </button>
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && alertsData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-400">Total Alerts</p>
                    <p className="text-3xl font-bold text-red-900 dark:text-red-300">
                      {alertsData.stats.total}
                    </p>
                  </div>
                  <div className="text-4xl">🚨</div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-400">Active Alerts</p>
                    <p className="text-3xl font-bold text-orange-900 dark:text-orange-300">
                      {alertsData.stats.active}
                    </p>
                  </div>
                  <div className="text-4xl">🔴</div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-400">Critical Alerts</p>
                    <p className="text-3xl font-bold text-red-900 dark:text-red-300">
                      {alertsData.stats.critical}
                    </p>
                  </div>
                  <div className="text-4xl">💀</div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-400">Last Updated</p>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-300">
                      {formatTimeAgo(alertsData.timestamp)}
                    </p>
                  </div>
                  <div className="text-4xl">🕐</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Alerts List */}
          <Card>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">📋</span>
                Recent Alerts ({alertsData.alerts.length})
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {alertsData.alerts.map((alert, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-red-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getCategoryBadge(alert.category)}
                          {getSeverityBadge(alert.severity)}
                          {getStatusBadge(alert.status)}
                        </div>
                        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {alert.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {alert.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Created: {formatTimeAgo(alert.createdAt)}</span>
                          <span>Metric: {alert.metric}</span>
                          <span>Threshold: {alert.threshold}</span>
                          <span>Current: {alert.currentValue.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => setSelectedAlert(alert)}
                          variant="outline"
                          size="sm"
                        >
                          View Details
                        </Button>
                        {alert.status === 'active' && (
                          <Button
                            onClick={() => updateAlert(alert.id, 'acknowledge')}
                            variant="warning"
                            size="sm"
                            disabled={updatingAlert === alert.id}
                          >
                            {updatingAlert === alert.id ? <LoadingSpinner size="sm" /> : 'Acknowledge'}
                          </Button>
                        )}
                        {alert.status === 'acknowledged' && (
                          <Button
                            onClick={() => updateAlert(alert.id, 'resolve')}
                            variant="success"
                            size="sm"
                            disabled={updatingAlert === alert.id}
                          >
                            {updatingAlert === alert.id ? <LoadingSpinner size="sm" /> : 'Resolve'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Bottlenecks Tab */}
      {activeTab === 'bottlenecks' && bottlenecksData && (
        <>
          {/* Bottleneck Summary */}
          <Card>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">🔍</span>
                Bottleneck Detection Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-4xl mb-2">🔗</div>
                  <p className="text-2xl font-bold text-blue-600">{bottlenecksData.bottlenecks.api.length}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">API Issues</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-4xl mb-2">🗄️</div>
                  <p className="text-2xl font-bold text-yellow-600">{bottlenecksData.bottlenecks.database.length}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Database Issues</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-4xl mb-2">💻</div>
                  <p className="text-2xl font-bold text-red-600">{bottlenecksData.bottlenecks.system.length}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">System Issues</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-4xl mb-2">📧</div>
                  <p className="text-2xl font-bold text-green-600">{bottlenecksData.bottlenecks.email.length}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email Issues</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Detailed Bottleneck Analysis */}
          {Object.entries(bottlenecksData.bottlenecks).map(([category, bottlenecks]) => (
            bottlenecks.length > 0 && (
              <Card key={category}>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center capitalize">
                    <span className="text-2xl mr-2">
                      {category === 'api' ? '🔗' : category === 'database' ? '🗄️' : category === 'system' ? '💻' : '📧'}
                    </span>
                    {category} Bottlenecks ({bottlenecks.length})
                  </h3>
                  <div className="space-y-4">
                    {bottlenecks.map((bottleneck, index) => (
                      <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                              {bottleneck.endpoint}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              Average Response Time: {bottleneck.averageResponseTime.toFixed(2)}ms
                            </p>
                            
                            {bottleneck.slowQueries.length > 0 && (
                              <div className="mb-3">
                                <h5 className="font-medium text-sm mb-2">Slow Queries ({bottleneck.slowQueries.length})</h5>
                                <div className="space-y-1">
                                  {bottleneck.slowQueries.slice(0, 3).map((query, i) => (
                                    <div key={i} className="text-xs bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded">
                                      <span className="font-mono">{query.query}</span>
                                      <span className="float-right text-yellow-600">{query.executionTime.toFixed(0)}ms</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {bottleneck.memoryLeaks.length > 0 && (
                              <div>
                                <h5 className="font-medium text-sm mb-2">Memory Issues</h5>
                                <div className="space-y-1">
                                  {bottleneck.memoryLeaks.map((leak, i) => (
                                    <div key={i} className="text-xs bg-red-100 dark:bg-red-900/20 p-2 rounded">
                                      <span>{leak.component}: {leak.memoryUsage.toFixed(1)}%</span>
                                      <span className={`float-right ${
                                        leak.trend === 'increasing' ? 'text-red-600' : 
                                        leak.trend === 'decreasing' ? 'text-green-600' : 'text-gray-600'
                                      }`}>
                                        {leak.trend === 'increasing' ? '↗️' : leak.trend === 'decreasing' ? '↘️' : '➡️'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <h5 className="font-medium text-sm mb-3">Resource Usage</h5>
                            <ResourceUsageBar label="CPU" value={bottleneck.resourceUsage.cpu} />
                            <ResourceUsageBar label="Memory" value={bottleneck.resourceUsage.memory} />
                            <ResourceUsageBar label="Database" value={bottleneck.resourceUsage.database} />
                            <ResourceUsageBar label="External Services" value={bottleneck.resourceUsage.external} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )
          ))}
        </>
      )}

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Alert Details</h3>
                <Button onClick={() => setSelectedAlert(null)} variant="outline" size="sm">
                  ✕ Close
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  {getCategoryBadge(selectedAlert.category)}
                  {getSeverityBadge(selectedAlert.severity)}
                  {getStatusBadge(selectedAlert.status)}
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Title</h4>
                  <p className="text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    {selectedAlert.title}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    {selectedAlert.description}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Performance Metrics</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Metric:</strong> {selectedAlert.metric}</p>
                      <p><strong>Threshold:</strong> {selectedAlert.threshold}</p>
                      <p><strong>Current Value:</strong> {selectedAlert.currentValue.toFixed(2)}</p>
                      <p><strong>Severity:</strong> {selectedAlert.severity}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Timeline</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Created:</strong> {new Date(selectedAlert.createdAt).toLocaleString()}</p>
                      <p><strong>Updated:</strong> {new Date(selectedAlert.updatedAt).toLocaleString()}</p>
                      {selectedAlert.resolvedAt && <p><strong>Resolved:</strong> {new Date(selectedAlert.resolvedAt).toLocaleString()}</p>}
                      {selectedAlert.acknowledgedBy && <p><strong>Acknowledged By:</strong> {selectedAlert.acknowledgedBy}</p>}
                    </div>
                  </div>
                </div>
                
                {selectedAlert.metadata && Object.keys(selectedAlert.metadata).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Additional Information</h4>
                    <div className="text-sm bg-gray-100 dark:bg-gray-700 p-3 rounded">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(selectedAlert.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  {selectedAlert.status === 'active' && (
                    <Button
                      onClick={() => updateAlert(selectedAlert.id, 'acknowledge')}
                      variant="warning"
                      disabled={updatingAlert === selectedAlert.id}
                    >
                      {updatingAlert === selectedAlert.id ? <LoadingSpinner size="sm" /> : 'Acknowledge Alert'}
                    </Button>
                  )}
                  {selectedAlert.status === 'acknowledged' && (
                    <Button
                      onClick={() => updateAlert(selectedAlert.id, 'resolve')}
                      variant="success"
                      disabled={updatingAlert === selectedAlert.id}
                    >
                      {updatingAlert === selectedAlert.id ? <LoadingSpinner size="sm" /> : 'Mark Resolved'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}