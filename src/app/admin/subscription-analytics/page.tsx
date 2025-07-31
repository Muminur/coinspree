'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface SubscriptionAnalytics {
  timestamp: string
  conversionMetrics: {
    totalUsers: number
    subscribedUsers: number
    conversionRate: number
    newSubscriptionsToday: number
    newSubscriptionsWeek: number
    newSubscriptionsMonth: number
  }
  revenueMetrics: {
    totalRevenue: number
    monthlyRevenue: number
    averageRevenuePerUser: number
    projectedAnnualRevenue: number
    revenueGrowthRate: number
  }
  subscriptionMetrics: {
    activeSubscriptions: number
    expiredSubscriptions: number
    pendingSubscriptions: number
    averageSubscriptionDuration: number
    churnRate: number
    renewalRate: number
  }
  paymentMetrics: {
    successfulPayments: number
    failedPayments: number
    pendingPayments: number
    paymentSuccessRate: number
    averagePaymentValue: number
    topPaymentAmounts: Array<{ amount: number; count: number }>
  }
  userJourney: {
    registrationToSubscription: Array<{
      stage: string
      users: number
      conversionRate: number
      dropoffRate: number
    }>
    funnelAnalysis: {
      registered: number
      visitedPricing: number
      initiatedPayment: number
      completedPayment: number
      conversionFunnel: number[]
    }
  }
  trends: {
    dailySubscriptions: Array<{
      date: string
      newSubscriptions: number
      revenue: number
      conversionRate: number
    }>
    monthlyGrowth: Array<{
      month: string
      subscriptions: number
      revenue: number
      growthRate: number
    }>
  }
}

export default function SubscriptionAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState('30d')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/subscription-analytics?timeframe=${timeframe}&details=true`, {
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
        setError(data.error || 'Failed to fetch subscription analytics')
      }
    } catch (err) {
      console.error('Subscription analytics fetch error:', err)
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

  const getConversionBadge = (rate: number) => {
    if (rate >= 15) return <Badge variant="success">Excellent</Badge>
    if (rate >= 10) return <Badge variant="warning">Good</Badge>
    if (rate >= 5) return <Badge variant="info">Average</Badge>
    return <Badge variant="danger">Needs Improvement</Badge>
  }

  const getGrowthBadge = (rate: number | null | undefined) => {
    const safeRate = rate ?? 0
    if (safeRate > 0) return <Badge variant="success">+{safeRate.toFixed(1)}%</Badge>
    if (safeRate === 0) return <Badge variant="info">0%</Badge>
    return <Badge variant="danger">{safeRate.toFixed(1)}%</Badge>
  }

  const formatCurrency = (amount: number | null | undefined) => {
    const safeAmount = amount ?? 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(safeAmount)
  }

  const formatPercentage = (value: number | null | undefined) => {
    const safeValue = value ?? 0
    return `${safeValue.toFixed(1)}%`
  }

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading subscription analytics...</span>
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
            No subscription analytics data available
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            💰 Subscription Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Monitor conversion rates, revenue metrics, and user journey analytics
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Timeframe Selector */}
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
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

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800 dark:text-purple-400">Conversion Rate</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-300">
                  {formatPercentage(analytics.conversionMetrics.conversionRate)}
                </p>
              </div>
              <div className="text-4xl">📈</div>
            </div>
            <div className="mt-4">
              {getConversionBadge(analytics.conversionMetrics.conversionRate)}
              <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                {analytics.conversionMetrics.subscribedUsers} of {analytics.conversionMetrics.totalUsers} users
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-400">Total Revenue</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-300">
                  {formatCurrency(analytics.revenueMetrics.totalRevenue)}
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
            <div className="mt-4">
              {getGrowthBadge(analytics.revenueMetrics.revenueGrowthRate)}
              <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                {formatCurrency(analytics.revenueMetrics.averageRevenuePerUser)} ARPU
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-400">Active Subscriptions</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">
                  {analytics.subscriptionMetrics.activeSubscriptions.toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
            <div className="mt-4">
              <Badge variant="success">
                {formatPercentage(analytics.subscriptionMetrics.renewalRate)} Renewal Rate
              </Badge>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                Avg duration: {analytics.subscriptionMetrics.averageSubscriptionDuration} days
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800 dark:text-orange-400">Payment Success</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-300">
                  {formatPercentage(analytics.paymentMetrics.paymentSuccessRate)}
                </p>
              </div>
              <div className="text-4xl">💳</div>
            </div>
            <div className="mt-4">
              <Badge variant="info">
                {analytics.paymentMetrics.successfulPayments} Successful
              </Badge>
              <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                {formatCurrency(analytics.paymentMetrics.averagePaymentValue)} avg payment
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Subscription Activity */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">📊</span>
            Recent Subscription Activity
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {analytics.conversionMetrics.newSubscriptionsToday}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">New Today</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {analytics.conversionMetrics.newSubscriptionsWeek}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">This Week</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {analytics.conversionMetrics.newSubscriptionsMonth}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Revenue Projections */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">💸</span>
            Revenue Analytics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Monthly Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(analytics.revenueMetrics.monthlyRevenue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Projected Annual</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(analytics.revenueMetrics.projectedAnnualRevenue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">ARPU</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(analytics.revenueMetrics.averageRevenuePerUser)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Growth Rate</p>
              <p className="text-2xl font-bold text-orange-600">
                +{(analytics.revenueMetrics.revenueGrowthRate ?? 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* User Journey Funnel */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">🚪</span>
            Conversion Funnel Analysis
          </h3>
          <div className="space-y-4">
            {analytics.userJourney.registrationToSubscription.map((stage, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-blue-500' :
                    index === 1 ? 'bg-purple-500' :
                    index === 2 ? 'bg-orange-500' : 'bg-green-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{stage.stage}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {stage.users.toLocaleString()} users
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">
                    {formatPercentage(stage.conversionRate)}
                  </p>
                  {stage.dropoffRate > 0 && (
                    <p className="text-sm text-red-500">
                      -{formatPercentage(stage.dropoffRate)} drop-off
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Payment Analysis */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">💳</span>
            Payment Analysis
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h4 className="font-medium mb-3">Payment Status Distribution</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Successful Payments</span>
                  <Badge variant="success">{analytics.paymentMetrics.successfulPayments}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending Payments</span>
                  <Badge variant="warning">{analytics.paymentMetrics.pendingPayments}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Failed Payments</span>
                  <Badge variant="danger">{analytics.paymentMetrics.failedPayments}</Badge>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Top Payment Amounts</h4>
              <div className="space-y-2">
                {analytics.paymentMetrics.topPaymentAmounts.slice(0, 5).map((payment, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{formatCurrency(payment.amount)}</span>
                    <Badge variant="info">{payment.count} payments</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Daily Subscription Trends */}
      {analytics.trends.dailySubscriptions.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">📈</span>
              Daily Subscription Trends (Last 7 Days)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">New Subscriptions</th>
                    <th className="text-right p-3">Revenue</th>
                    <th className="text-right p-3">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.trends.dailySubscriptions.slice(-7).map((day, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-3 font-medium">{day.date}</td>
                      <td className="p-3 text-right text-blue-600 font-medium">{day.newSubscriptions}</td>
                      <td className="p-3 text-right text-green-600 font-medium">
                        {formatCurrency(day.revenue)}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-medium ${day.conversionRate >= 5 ? 'text-green-600' : day.conversionRate >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {formatPercentage(day.conversionRate)}
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

      {/* Monthly Growth Trends */}
      {analytics.trends.monthlyGrowth.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">📊</span>
              Monthly Growth Trends
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.trends.monthlyGrowth.slice(-6).map((month, index) => (
                <div key={index} className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{month.month}</p>
                  <p className="text-xl font-bold text-blue-600">{month.subscriptions} subs</p>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(month.revenue)}</p>
                  <div className="mt-2">
                    {getGrowthBadge(month.growthRate)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}