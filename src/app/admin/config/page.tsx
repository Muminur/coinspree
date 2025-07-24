'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

interface SystemConfig {
  coinGeckoApiKey?: string
  emailFromAddress: string
  emailReplyTo: string
  cronInterval: number
  maxNotificationsPerUser: number
  subscriptionPrices: {
    monthly: number
    yearly: number
  }
  tronWalletAddress: string
  athDetectionThreshold: number
}

interface CronJob {
  name: string
  schedule: string
  lastRun: string
  status: 'active' | 'inactive' | 'error'
  description: string
}

export default function AdminConfig() {
  const [config, setConfig] = useState<SystemConfig>({
    emailFromAddress: 'notifications@urgent.coinspree.cc',
    emailReplyTo: 'support@urgent.coinspree.cc',
    cronInterval: 5,
    maxNotificationsPerUser: 10,
    subscriptionPrices: { monthly: 3, yearly: 30 },
    tronWalletAddress: 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs',
    athDetectionThreshold: 0.01
  })
  
  const [cronJobs, setCronJobs] = useState<CronJob[]>([
    {
      name: 'ATH Detection',
      schedule: '*/5 * * * *',
      lastRun: 'Loading...',
      status: 'active',
      description: 'Monitor cryptocurrency prices for new all-time highs'
    },
    {
      name: 'Subscription Expiry Check',
      schedule: '0 9 * * *',
      lastRun: 'Not implemented',
      status: 'inactive',
      description: 'Send expiry warnings and cleanup expired subscriptions'
    },
    {
      name: 'Email Queue Processor',
      schedule: '*/2 * * * *',
      lastRun: 'Not implemented',
      status: 'inactive',
      description: 'Process pending email notifications in queue'
    }
  ])

  useEffect(() => {
    // Fetch actual cron run times
    const fetchCronStatus = async () => {
      try {
        const response = await fetch('/api/admin/analytics', { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          setCronJobs(prev => prev.map(job => 
            job.name === 'ATH Detection' 
              ? { ...job, lastRun: data.data.lastCronRun || 'Never' }
              : job
          ))
        }
      } catch (error) {
        console.error('Failed to fetch cron status:', error)
      }
    }
    fetchCronStatus()
  }, [])
  
  const [loading, setLoading] = useState(false)
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [backupModalOpen, setBackupModalOpen] = useState(false)
  const [testResults, setTestResults] = useState<string[]>([])

  const handleSaveConfig = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config)
      })

      if (response.ok) {
        console.log('Configuration saved successfully')
      }
    } catch (error) {
      console.error('Failed to save configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTestSystem = async () => {
    setTestResults([])
    setTestModalOpen(true)
    
    const tests = [
      { name: 'Database Connection', test: () => fetch('/api/admin/analytics', { credentials: 'include' }) },
      { name: 'CoinGecko API', test: () => fetch('/api/crypto/top100', { credentials: 'include' }) },
      { name: 'Email Service', test: () => fetch('/api/notifications/test', { method: 'POST', credentials: 'include' }) },
      { name: 'Subscription System', test: () => fetch('/api/admin/subscriptions', { credentials: 'include' }) }
    ]

    for (const testCase of tests) {
      try {
        const response = await testCase.test()
        const result = response.ok ? '✅ PASS' : '❌ FAIL'
        setTestResults(prev => [...prev, `${testCase.name}: ${result}`])
      } catch (error) {
        setTestResults(prev => [...prev, `${testCase.name}: ❌ ERROR`])
      }
    }
  }

  const handleBackupData = async () => {
    try {
      setBackupModalOpen(true)
      window.open('/api/admin/export', '_blank')
    } catch (error) {
      console.error('Failed to initiate backup:', error)
    }
  }

  const handleTriggerCron = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/trigger-cron', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        alert(`✅ Cron job triggered successfully!\n\nResult: ${result.cronResult?.athCount || 0} ATHs detected\nDuration: ${result.cronResult?.duration || 0}ms`)
        
        // Refresh cron status
        const analyticsResponse = await fetch('/api/admin/analytics', { credentials: 'include' })
        if (analyticsResponse.ok) {
          const data = await analyticsResponse.json()
          setCronJobs(prev => prev.map(job => 
            job.name === 'ATH Detection' 
              ? { ...job, lastRun: data.data.lastCronRun || 'Never' }
              : job
          ))
        }
      } else {
        alert('❌ Failed to trigger cron job')
      }
    } catch (error) {
      console.error('Failed to trigger cron:', error)
      alert('❌ Error triggering cron job')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/sync-notifications', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        alert(`✅ Notification preferences synced successfully!\n\nBefore: ${result.data.before.withNotifications}/${result.data.before.total} users with notifications\nAfter: ${result.data.after.withNotifications}/${result.data.after.total} users with notifications\n\n${result.data.changed ? 'Changes were made!' : 'No changes needed.'}`)
      } else {
        alert('❌ Failed to sync notification preferences')
      }
    } catch (error) {
      console.error('Failed to sync notifications:', error)
      alert('❌ Error syncing notification preferences')
    } finally {
      setLoading(false)
    }
  }

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Configuration</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage system settings, cron jobs, and maintenance tasks
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={handleSyncNotifications}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? '🔄 Syncing...' : '📧 Sync Notifications'}
          </Button>
          <Button
            onClick={handleTriggerCron}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? '🔄 Running...' : '⚡ Trigger Cron'}
          </Button>
          <Button
            onClick={handleTestSystem}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            🧪 Test System
          </Button>
          <Button
            onClick={handleBackupData}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            💾 Backup Data
          </Button>
          <Button
            onClick={handleSaveConfig}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? '🔄 Saving...' : '💾 Save Config'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Configuration */}
        <Card>
          <CardHeader
            title="Email Configuration"
            description="Email service settings and notification preferences"
          />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Address
              </label>
              <Input
                value={config.emailFromAddress}
                onChange={(e) => setConfig({ ...config, emailFromAddress: e.target.value })}
                placeholder="notifications@coinspree.cc"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reply-To Address
              </label>
              <Input
                value={config.emailReplyTo}
                onChange={(e) => setConfig({ ...config, emailReplyTo: e.target.value })}
                placeholder="support@coinspree.cc"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Notifications per User (daily)
              </label>
              <Input
                type="number"
                value={config.maxNotificationsPerUser}
                onChange={(e) => setConfig({ ...config, maxNotificationsPerUser: parseInt(e.target.value) || 0 })}
                min="1"
                max="50"
              />
            </div>
          </div>
        </Card>

        {/* Subscription Settings */}
        <Card>
          <CardHeader
            title="Subscription Settings"
            description="Payment configuration and pricing"
          />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Monthly Plan Price (USDT)
              </label>
              <Input
                type="number"
                value={config.subscriptionPrices.monthly}
                onChange={(e) => setConfig({ 
                  ...config, 
                  subscriptionPrices: { 
                    ...config.subscriptionPrices, 
                    monthly: parseFloat(e.target.value) || 0 
                  }
                })}
                min="1"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Yearly Plan Price (USDT)
              </label>
              <Input
                type="number"
                value={config.subscriptionPrices.yearly}
                onChange={(e) => setConfig({ 
                  ...config, 
                  subscriptionPrices: { 
                    ...config.subscriptionPrices, 
                    yearly: parseFloat(e.target.value) || 0 
                  }
                })}
                min="1"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                TRON Wallet Address
              </label>
              <Input
                value={config.tronWalletAddress}
                onChange={(e) => setConfig({ ...config, tronWalletAddress: e.target.value })}
                placeholder="TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs"
                className="font-mono text-sm"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* ATH Detection Settings */}
      <Card>
        <CardHeader
          title="ATH Detection Configuration"
          description="Settings for cryptocurrency all-time high monitoring"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Detection Threshold (%)
            </label>
            <Input
              type="number"
              value={config.athDetectionThreshold}
              onChange={(e) => setConfig({ ...config, athDetectionThreshold: parseFloat(e.target.value) || 0 })}
              min="0.001"
              max="10"
              step="0.001"
              placeholder="0.01"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Minimum percentage increase to trigger ATH notification
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cron Interval (minutes)
            </label>
            <Input
              type="number"
              value={config.cronInterval}
              onChange={(e) => setConfig({ ...config, cronInterval: parseInt(e.target.value) || 0 })}
              min="1"
              max="60"
              placeholder="5"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              How often to check for new ATHs
            </p>
          </div>
        </div>
      </Card>

      {/* Cron Jobs Status */}
      <Card>
        <CardHeader
          title="Scheduled Jobs"
          description="System automation and maintenance tasks"
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Job Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Run
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {cronJobs.map((job, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {job.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {job.schedule}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getJobStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {job.lastRun}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {job.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* System Test Modal */}
      <Modal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        title="System Test Results"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Running comprehensive system tests...
          </p>
          
          <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm">
            {testResults.length === 0 ? (
              <div className="text-yellow-400">Starting tests...</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-gray-300">
                  {result}
                </div>
              ))
            )}
          </div>
          
          <div className="flex justify-end pt-4">
            <Button
              onClick={() => setTestModalOpen(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Backup Modal */}
      <Modal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
        title="Data Backup"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Data backup has been initiated. The backup file will download automatically.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Backup Includes:</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• All user accounts (excluding passwords)</li>
              <li>• Subscription data and payment records</li>
              <li>• Recent cryptocurrency data (7 days)</li>
              <li>• ATH notification history</li>
              <li>• System configuration settings</li>
            </ul>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button
              onClick={() => setBackupModalOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}