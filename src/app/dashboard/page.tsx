'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardHeader, StatsCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { CryptoTable } from '@/components/crypto/CryptoTable'
import Link from 'next/link'

interface Subscription {
  id: string
  status: 'active' | 'expired' | 'blocked'
  startDate: string
  endDate: string
  paymentTxHash: string
  amount: number
}

interface ATHRecord {
  id: string
  cryptoId: string
  symbol: string
  name: string
  newATH: number
  previousATH: number
  percentageIncrease: number
  athDate: string
  sentAt?: string
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [athRecords, setAthRecords] = useState<ATHRecord[]>([])
  const [athLoading, setAthLoading] = useState(true)
  const [notificationCount, setNotificationCount] = useState<number>(0)
  const [notificationLoading, setNotificationLoading] = useState(true)

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return
      
      try {
        const response = await fetch('/api/subscription/status', {
          credentials: 'include'
        })
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data.hasSubscription) {
            // Convert the API response to subscription format
            const subscriptionData = {
              id: result.data.id || 'unknown',
              status: result.data.status,
              startDate: result.data.startDate,
              endDate: result.data.endDate,
              paymentTxHash: result.data.paymentTxHash || '',
              amount: result.data.amount || 0
            }
            setSubscription(subscriptionData)
          } else {
            setSubscription(null)
          }
        } else {
          setSubscription(null)
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error)
        setSubscription(null)
      } finally {
        setSubscriptionLoading(false)
      }
    }

    if (user) {
      fetchSubscription()
    }
  }, [user])

  useEffect(() => {
    const fetchNotificationCount = async () => {
      if (!user) return
      
      try {
        const response = await fetch('/api/user/notification-count', {
          credentials: 'include'
        })
        if (response.ok) {
          const result = await response.json()
          setNotificationCount(result.data?.totalNotifications || 0)
        } else {
          setNotificationCount(0)
        }
      } catch (error) {
        console.error('Failed to fetch notification count:', error)
        setNotificationCount(0)
      } finally {
        setNotificationLoading(false)
      }
    }

    if (user) {
      fetchNotificationCount()
    }
  }, [user])

  useEffect(() => {
    const fetchRecentATHs = async () => {
      if (!user) return
      
      try {
        const response = await fetch('/api/user/recent-ath-notifications?hours=168&limit=3', { // 7 days, 3 most recent
          credentials: 'include'
        })
        if (response.ok) {
          const result = await response.json()
          const records = result.athRecords || result.data || []
          setAthRecords(Array.isArray(records) ? records : [])
        } else {
          setAthRecords([])
        }
      } catch (error) {
        console.error('Failed to fetch ATH records:', error)
        setAthRecords([])
      } finally {
        setAthLoading(false)
      }
    }

    if (user) {
      fetchRecentATHs()
    }
  }, [user])

  if (loading) {
    return (
      <MainLayout showSidebar>
        <div className="space-y-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!user) {
    return (
      <MainLayout showSidebar>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <Link href="/login" className="btn-primary">
            Sign In
          </Link>
        </div>
      </MainLayout>
    )
  }

  const activeSubscriptions = subscription && subscription.status === 'active' ? 1 : 0
  const subscriptionStatusText = subscription && subscription.status ? 
    subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1) : 
    'No Subscription'
  
  const subscriptionEndDate = subscription ? 
    new Date(subscription.endDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : 
    'N/A'

  // Calculate ATHs from today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const newATHsToday = athRecords.filter(record => {
    const recordDate = new Date(record.athDate)
    recordDate.setHours(0, 0, 0, 0)
    return recordDate.getTime() === today.getTime()
  }).length

  return (
    <MainLayout showSidebar>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user.email}!</h1>
            <div className="flex items-center gap-3">
              <Badge variant="info">
                Role: {user.role}
              </Badge>
              {user.role === 'admin' && (
                <Link href="/admin" className="btn-primary px-3 py-1 text-sm">
                  👑 Admin Panel
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Active Subscriptions"
            value={subscriptionLoading ? "..." : activeSubscriptions.toString()}
            icon="💳"
          />
          <StatsCard
            title="ATH Notifications"
            value={notificationLoading ? "..." : notificationCount.toString()}
            icon="🔔"
          />
          <StatsCard
            title="Tracked Coins"
            value="100"
            icon="🪙"
          />
          <StatsCard
            title="New ATHs Today"
            value={athLoading ? "..." : newATHsToday.toString()}
            icon="🚀"
          />
        </div>

        {/* Recent ATH Activity */}
        <Card>
          <CardHeader
            title="Recent ATH Activity"
            description="Latest all-time highs from the top 100 cryptocurrencies"
            action={
              <Link href="/dashboard/ath-history" className="btn-secondary px-4 py-2 text-sm">
                View All
              </Link>
            }
          />
          {athLoading ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Cryptocurrency</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">New ATH Price</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Increase</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3 animate-pulse">
                          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                          <div>
                            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="animate-pulse">
                          <div className="h-6 bg-gray-200 rounded w-32 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-28"></div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : athRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Cryptocurrency</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">New ATH Price</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Increase</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {athRecords.map((record, index) => (
                    <tr key={record.id} className={`border-b border-gray-100 hover:bg-green-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {(record.symbol || record.cryptoId || '??').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{record.name || record.cryptoId || 'Unknown'}</h3>
                            <p className="text-sm text-gray-600 uppercase font-medium">
                              {record.symbol || record.cryptoId?.toUpperCase() || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-xl text-green-600 font-mono">
                          ${(record.newATH || 0).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 8
                          })}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Previous: ${(record.previousATH || 0).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 8
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 bg-green-100 px-3 py-2 rounded-lg border border-green-300 w-fit">
                          <span className="text-green-600 text-lg">📈</span>
                          <span className="font-bold text-green-700 text-lg">
                            +{(record.percentageIncrease || 0).toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {(() => {
                          try {
                            const date = new Date(record.athDate || record.sentAt || Date.now())
                            return (
                              <>
                                <div className="font-semibold text-gray-900">
                                  {date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {date.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </div>
                              </>
                            )
                          } catch (error) {
                            return (
                              <>
                                <div className="font-semibold text-gray-900">
                                  Invalid Date
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  --:--
                                </div>
                              </>
                            )
                          }
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-4">📊</div>
              <p>No recent ATH activity to display.</p>
              <p className="text-sm mt-2">Check back later or view historical data.</p>
            </div>
          )}
        </Card>

        {/* Top Cryptocurrencies */}
        <Card>
          <CardHeader
            title="Top Cryptocurrencies"
            description="Current prices and ATH data for the top 100 cryptocurrencies"
            action={
              <Link href="/dashboard/top100" className="btn-secondary px-4 py-2 text-sm">
                View All 100
              </Link>
            }
          />
          <CryptoTable limit={10} />
        </Card>

        {/* Subscription Status */}
        <Card>
          <CardHeader
            title="Subscription Status"
            description="Manage your subscription and notification preferences"
          />
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="text-2xl">💳</div>
              <div>
                <p className="font-medium">Subscription Status</p>
                {subscriptionLoading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-24 mt-1"></div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={subscription?.status || 'expired'} />
                    <span className="text-sm text-muted-foreground">
                      {subscription ? `Expires: ${subscriptionEndDate}` : 'No active subscription'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/subscription" className="btn-secondary px-4 py-2 text-sm">
                {subscription ? 'Manage' : 'Subscribe'}
              </Link>
              {subscription && subscription.status === 'active' && (
                <Link href="/subscription" className="btn-primary px-4 py-2 text-sm">
                  Renew
                </Link>
              )}
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader
            title="Quick Actions"
            description="Common tasks and useful links"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/profile" className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
              <span className="text-2xl">👤</span>
              <div>
                <p className="font-medium">Update Profile</p>
                <p className="text-sm text-muted-foreground">Change email or password</p>
              </div>
            </Link>
            
            <Link href="/dashboard/notifications" className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
              <span className="text-2xl">🔔</span>
              <div>
                <p className="font-medium">Notification Settings</p>
                <p className="text-sm text-muted-foreground">Configure alert preferences</p>
              </div>
            </Link>
            
            <Link href="/help" className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
              <span className="text-2xl">❓</span>
              <div>
                <p className="font-medium">Help Center</p>
                <p className="text-sm text-muted-foreground">FAQ and support</p>
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </MainLayout>
  )
}
