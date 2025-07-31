'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, StatsCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface AdminStats {
  totalUsers: number
  activeSubscriptions: number
  pendingSubscriptions: number
  totalRevenue: number
  athDetections24h: number
  emailsSent24h: number
  systemUptime: string
  lastCronRun: string
}

interface RecentActivity {
  id: string
  type: 'user_registration' | 'subscription_created' | 'ath_detected' | 'payment_received'
  description: string
  timestamp: string
  status: 'success' | 'pending' | 'failed'
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      
      // Fetch admin stats
      const statsResponse = await fetch('/api/admin/analytics', {
        credentials: 'include'
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.data)
      }

      // Fetch recent activity  
      const activityResponse = await fetch('/api/admin/activity', {
        credentials: 'include'
      })
      
      if (activityResponse.ok) {
        const activityData = await activityResponse.json()
        setRecentActivity(activityData.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100' 
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration': return '👤'
      case 'subscription_created': return '💳'
      case 'ath_detected': return '🚀'
      case 'payment_received': return '💰'
      default: return '📝'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            System overview and administrative controls
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={fetchAdminData}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            🔄 Refresh Data
          </Button>
          <Link href="/admin/config">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white">
              ⚙️ System Config
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers?.toString() || '0'}
          icon="👥"
        />
        <StatsCard
          title="Active Subscriptions"
          value={stats?.activeSubscriptions?.toString() || '0'}
          icon="💳"
        />
        <Link href="/admin/pending-payments">
          <StatsCard
            title="Pending Payments"
            value={stats?.pendingSubscriptions?.toString() || '0'}
            icon="⏳"
            className="hover:shadow-lg transition-shadow cursor-pointer border-amber-200 dark:border-amber-800"
          />
        </Link>
        <StatsCard
          title="Total Revenue"
          value={`$${stats?.totalRevenue?.toLocaleString() || '0'}`}
          icon="💰"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatsCard
          title="ATH Detections (24h)"
          value={stats?.athDetections24h?.toString() || '0'}
          icon="🚀"
        />
        <StatsCard
          title="Emails Sent (24h)"
          value={stats?.emailsSent24h?.toString() || '0'}
          icon="📧"
        />
        <StatsCard
          title="System Uptime"
          value={stats?.systemUptime || 'Unknown'}
          icon="⚡"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader
            title="Quick Actions"
            description="Common administrative tasks"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/admin/users">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12">
                👥 Manage Users
              </Button>
            </Link>
            <Link href="/admin/subscriptions">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-12">
                💳 Subscriptions
              </Button>
            </Link>
            <Link href="/admin/pending-payments">
              <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white h-12">
                ⏳ Pending Payments
              </Button>
            </Link>
            <Link href="/admin/analytics">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12">
                📊 Analytics
              </Button>
            </Link>
            <Link href="/admin/monitoring">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12">
                🔧 Performance Monitor
              </Button>
            </Link>
            <Button 
              onClick={() => window.open('/api/admin/export', '_blank')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white h-12"
            >
              📁 Export Data
            </Button>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader
            title="Recent Activity"
            description="Latest system events and user actions"
          />
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <span className="text-2xl mb-2 block">📝</span>
                No recent activity to display
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getActivityIcon(activity.type)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(activity.status)}>
                    {activity.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader
          title="System Status"
          description="Current system health and performance metrics"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="text-center">
            <div className="text-green-500 text-3xl mb-2">✅</div>
            <h3 className="font-semibold text-gray-900 dark:text-white">API Status</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">All systems operational</p>
          </div>
          <div className="text-center">
            <div className="text-blue-500 text-3xl mb-2">🔄</div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Last Cron Run</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {stats?.lastCronRun || 'Unknown'}
            </p>
          </div>
          <div className="text-center">
            <div className="text-purple-500 text-3xl mb-2">🌐</div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Database</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Connected & healthy</p>
          </div>
        </div>
      </Card>
    </div>
  )
}