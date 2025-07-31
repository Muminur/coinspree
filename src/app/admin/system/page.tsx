'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'

interface JobStatus {
  lastRun: string | null
  lastDuration: number | null
  status: string
  nextExpectedRun: string | null
}

interface SystemStatus {
  backgroundJobs: {
    isRunning: boolean
    activeJobs: number
    startedAt: string
    uptime: number
    uptimeFormatted: string
  }
  health: {
    lastCheck: string | null
    duration: number | null
    score: number
    status: string
    issues: string[]
  }
}

interface BackgroundJobsData {
  system: SystemStatus
  jobs: {
    athDetection: JobStatus & { lastCount: number | null; lastError: string | null }
    subscriptionExpiry: JobStatus & { emailsSent: number | null; expiredCount: number | null }
    emailQueue: JobStatus & { lastProcessed: number | null; lastSent: number | null; lastFailed: number | null }
  }
  data: {
    cryptoLastUpdate: string | null
    cryptoUpdateStatus: string
  }
}

export default function SystemMonitoringPage() {
  const [data, setData] = useState<BackgroundJobsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/background-jobs/status', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status')
    } finally {
      setLoading(false)
    }
  }

  const performAction = async (action: string) => {
    setActionLoading(action)
    try {
      const response = await fetch('/api/admin/background-jobs/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Action failed: ${response.status}`)
      }
      
      // Refresh status after action
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform action')
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'never_ran': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'Never'
    return new Date(timeString).toLocaleString()
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Alert variant="error" className="mb-6">
            <strong>Error:</strong> {error}
          </Alert>
          <Button onClick={fetchStatus}>Retry</Button>
        </div>
      </MainLayout>
    )
  }

  if (!data) return null

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            System Monitoring
          </h1>
          <Button onClick={fetchStatus} variant="outline">
            🔄 Refresh
          </Button>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Background Jobs
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.system.backgroundJobs.isRunning ? 'Running' : 'Stopped'}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${data.system.backgroundJobs.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Uptime: {data.system.backgroundJobs.uptimeFormatted}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Health Score
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.system.health.score}/100
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${data.system.health.score > 80 ? 'bg-green-500' : data.system.health.score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {data.system.health.issues.length} issues
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Jobs
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.system.backgroundJobs.activeJobs}
                </p>
              </div>
              <span className="text-2xl">⚙️</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Crypto Data
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.data.cryptoUpdateStatus === 'recent' ? 'Fresh' : 'Stale'}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${data.data.cryptoUpdateStatus === 'recent' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {formatTime(data.data.cryptoLastUpdate)}
            </p>
          </Card>
        </div>

        {/* Control Panel */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Control Panel
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => performAction('start')}
              disabled={!!actionLoading || data.system.backgroundJobs.isRunning}
              variant="primary"
            >
              {actionLoading === 'start' ? '⏳' : '▶️'} Start Jobs
            </Button>
            <Button 
              onClick={() => performAction('stop')}
              disabled={!!actionLoading || !data.system.backgroundJobs.isRunning}
              variant="outline"
            >
              {actionLoading === 'stop' ? '⏳' : '⏹️'} Stop Jobs
            </Button>
            <Button 
              onClick={() => performAction('restart')}
              disabled={!!actionLoading}
              variant="outline"
            >
              {actionLoading === 'restart' ? '⏳' : '🔄'} Restart Jobs
            </Button>
            <Button 
              onClick={() => performAction('run_ath')}
              disabled={!!actionLoading}
              variant="outline"
            >
              {actionLoading === 'run_ath' ? '⏳' : '🔍'} Run ATH Detection
            </Button>
            <Button 
              onClick={() => performAction('run_subscription')}
              disabled={!!actionLoading}
              variant="outline"
            >
              {actionLoading === 'run_subscription' ? '⏳' : '📅'} Run Subscription Check
            </Button>
            <Button 
              onClick={() => performAction('run_email')}
              disabled={!!actionLoading}
              variant="outline"
            >
              {actionLoading === 'run_email' ? '⏳' : '📧'} Process Email Queue
            </Button>
          </div>
        </Card>

        {/* Health Issues */}
        {data.system.health.issues.length > 0 && (
          <Alert variant="warning" className="mb-8">
            <strong>System Issues:</strong>
            <ul className="mt-2 list-disc list-inside">
              {data.system.health.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Job Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ATH Detection */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                🔍 ATH Detection
              </h3>
              <Badge className={getStatusColor(data.jobs.athDetection.status)}>
                {data.jobs.athDetection.status}
              </Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Last Run:</span> {formatTime(data.jobs.athDetection.lastRun)}
              </div>
              <div>
                <span className="font-medium">Duration:</span> {data.jobs.athDetection.lastDuration || 0}ms
              </div>
              <div>
                <span className="font-medium">ATHs Found:</span> {data.jobs.athDetection.lastCount || 0}
              </div>
              <div>
                <span className="font-medium">Next Run:</span> {formatTime(data.jobs.athDetection.nextExpectedRun)}
              </div>
              {data.jobs.athDetection.lastError && (
                <div className="text-red-600 dark:text-red-400">
                  <span className="font-medium">Error:</span> {data.jobs.athDetection.lastError}
                </div>
              )}
            </div>
          </Card>

          {/* Subscription Expiry */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                📅 Subscription Expiry
              </h3>
              <Badge className={getStatusColor(data.jobs.subscriptionExpiry.status)}>
                {data.jobs.subscriptionExpiry.status}
              </Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Last Run:</span> {formatTime(data.jobs.subscriptionExpiry.lastRun)}
              </div>
              <div>
                <span className="font-medium">Duration:</span> {data.jobs.subscriptionExpiry.lastDuration || 0}ms
              </div>
              <div>
                <span className="font-medium">Emails Sent:</span> {data.jobs.subscriptionExpiry.emailsSent || 0}
              </div>
              <div>
                <span className="font-medium">Expired:</span> {data.jobs.subscriptionExpiry.expiredCount || 0}
              </div>
              <div>
                <span className="font-medium">Next Run:</span> {formatTime(data.jobs.subscriptionExpiry.nextExpectedRun)}
              </div>
            </div>
          </Card>

          {/* Email Queue */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                📧 Email Queue
              </h3>
              <Badge className={getStatusColor(data.jobs.emailQueue.status)}>
                {data.jobs.emailQueue.status}
              </Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Last Run:</span> {formatTime(data.jobs.emailQueue.lastRun)}
              </div>
              <div>
                <span className="font-medium">Duration:</span> {data.jobs.emailQueue.lastDuration || 0}ms
              </div>
              <div>
                <span className="font-medium">Processed:</span> {data.jobs.emailQueue.lastProcessed || 0}
              </div>
              <div>
                <span className="font-medium">Sent:</span> {data.jobs.emailQueue.lastSent || 0}
              </div>
              <div>
                <span className="font-medium">Failed:</span> {data.jobs.emailQueue.lastFailed || 0}
              </div>
              <div>
                <span className="font-medium">Next Run:</span> {formatTime(data.jobs.emailQueue.nextExpectedRun)}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}