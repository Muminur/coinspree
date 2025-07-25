'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface UserFeedback {
  id: string
  userId?: string
  userEmail?: string
  type: 'bug' | 'feature' | 'improvement' | 'complaint' | 'praise' | 'question' | 'other'
  category: 'ui' | 'performance' | 'functionality' | 'design' | 'content' | 'navigation' | 'subscription' | 'notifications' | 'general'
  title: string
  message: string
  rating?: number
  page?: string
  userAgent?: string
  screenResolution?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  sentiment: 'positive' | 'neutral' | 'negative'
  status: 'new' | 'in_review' | 'acknowledged' | 'resolved' | 'closed'
  adminNotes?: string
  assignedTo?: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
  attachments?: string[]
  upvotes: number
  tags: string[]
}

interface FeedbackAnalytics {
  timestamp: string
  summary: {
    totalFeedback: number
    newFeedback: number
    averageRating: number
    responseRate: number
    satisfactionScore: number
  }
  sentimentBreakdown: {
    positive: number
    neutral: number
    negative: number
  }
  typeBreakdown: Record<string, number>
  categoryBreakdown: Record<string, number>
  priorityBreakdown: Record<string, number>
  statusBreakdown: Record<string, number>
  recentFeedback: UserFeedback[]
  topIssues: Array<{
    title: string
    count: number
    category: string
    averageRating: number
    sentiment: string
  }>
  trends: {
    dailyFeedback: Array<{
      date: string
      count: number
      averageRating: number
      positiveCount: number
      negativeCount: number
    }>
    popularFeatureRequests: Array<{
      title: string
      upvotes: number
      category: string
      createdAt: string
    }>
  }
}

export default function FeedbackDashboard() {
  const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null)
  const [updatingFeedback, setUpdatingFeedback] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/feedback?admin=true', {
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
        setError(data.error || 'Failed to fetch feedback analytics')
      }
    } catch (err) {
      console.error('Feedback analytics fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const updateFeedback = async (feedbackId: string, updates: {
    status?: string
    adminNotes?: string
    assignedTo?: string
    priority?: string
    tags?: string[]
  }) => {
    try {
      setUpdatingFeedback(feedbackId)
      const response = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          feedbackId,
          ...updates
        })
      })
      
      if (response.ok) {
        await fetchAnalytics() // Refresh data
        setSelectedFeedback(null)
      } else {
        console.error('Failed to update feedback')
      }
    } catch (err) {
      console.error('Error updating feedback:', err)
    } finally {
      setUpdatingFeedback(null)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchAnalytics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [autoRefresh])

  const getTypeBadge = (type: string) => {
    const badges = {
      bug: <Badge variant="danger">🐛 Bug</Badge>,
      feature: <Badge variant="info">💡 Feature</Badge>,
      improvement: <Badge variant="warning">⚡ Improvement</Badge>,
      complaint: <Badge variant="danger">😞 Complaint</Badge>,
      praise: <Badge variant="success">👏 Praise</Badge>,
      question: <Badge variant="info">❓ Question</Badge>,
      other: <Badge variant="secondary">📝 Other</Badge>
    }
    return badges[type as keyof typeof badges] || <Badge variant="secondary">{type}</Badge>
  }

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Badge variant="success">😊 Positive</Badge>
      case 'negative':
        return <Badge variant="danger">😞 Negative</Badge>
      default:
        return <Badge variant="secondary">😐 Neutral</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
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
    const badges = {
      new: <Badge variant="info">🆕 New</Badge>,
      in_review: <Badge variant="warning">👀 In Review</Badge>,
      acknowledged: <Badge variant="info">✅ Acknowledged</Badge>,
      resolved: <Badge variant="success">✅ Resolved</Badge>,
      closed: <Badge variant="secondary">🔒 Closed</Badge>
    }
    return badges[status as keyof typeof badges] || <Badge variant="secondary">{status}</Badge>
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      ui: '🎨',
      performance: '⚡',
      functionality: '⚙️',
      design: '🎨',
      content: '📝',
      navigation: '🧭',
      subscription: '💳',
      notifications: '📧',
      general: '📋'
    }
    return icons[category] || '📝'
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

  const StarDisplay = ({ rating }: { rating?: number }) => {
    if (!rating) return <span className="text-gray-400">No rating</span>
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}
          >
            ⭐
          </span>
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    )
  }

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading feedback analytics...</span>
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
            No feedback analytics data available
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            💬 User Feedback Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor user feedback, satisfaction, and feature requests
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

      {/* Last Updated */}
      <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
        Last updated: {new Date(analytics.timestamp).toLocaleString()}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-400">Total Feedback</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">
                  {analytics.summary.totalFeedback.toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">💬</div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800 dark:text-orange-400">New Feedback</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-300">
                  {analytics.summary.newFeedback}
                </p>
              </div>
              <div className="text-4xl">🆕</div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Avg Rating</p>
                <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-300">
                  {analytics.summary.averageRating.toFixed(1)}⭐
                </p>
              </div>
              <div className="text-4xl">⭐</div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-400">Response Rate</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-300">
                  {analytics.summary.responseRate.toFixed(1)}%
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800 dark:text-purple-400">Satisfaction</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-300">
                  {analytics.summary.satisfactionScore.toFixed(1)}%
                </p>
              </div>
              <div className="text-4xl">😊</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Sentiment Breakdown */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">📊</span>
            Sentiment Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-4xl mb-2">😊</div>
              <p className="text-2xl font-bold text-green-600">{analytics.sentimentBreakdown.positive}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Positive</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-4xl mb-2">😐</div>
              <p className="text-2xl font-bold text-gray-600">{analytics.sentimentBreakdown.neutral}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Neutral</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-4xl mb-2">😞</div>
              <p className="text-2xl font-bold text-red-600">{analytics.sentimentBreakdown.negative}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Negative</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Feedback Type & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">📝</span>
              Feedback Types
            </h3>
            <div className="space-y-3">
              {Object.entries(analytics.typeBreakdown).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  {getTypeBadge(type)}
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">🏷️</span>
              Categories
            </h3>
            <div className="space-y-3">
              {Object.entries(analytics.categoryBreakdown).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span>{getCategoryIcon(category)}</span>
                    <span className="capitalize">{category}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Top Issues */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">🔝</span>
            Top Issues & Requests
          </h3>
          <div className="space-y-3">
            {analytics.topIssues.slice(0, 10).map((issue, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getSentimentBadge(issue.sentiment)}
                      <span className="text-sm text-gray-500">
                        {getCategoryIcon(issue.category)} {issue.category}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {issue.title}
                    </p>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {issue.count} report{issue.count !== 1 ? 's' : ''}
                      </span>
                      {issue.averageRating > 0 && (
                        <StarDisplay rating={Math.round(issue.averageRating)} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Popular Feature Requests */}
      {analytics.trends.popularFeatureRequests.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">💡</span>
              Popular Feature Requests
            </h3>
            <div className="space-y-3">
              {analytics.trends.popularFeatureRequests.map((request, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {request.title}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {getCategoryIcon(request.category)} {request.category}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatTimeAgo(request.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="info">{request.upvotes} 👍</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Recent Feedback */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">🕐</span>
            Recent Feedback ({analytics.recentFeedback.length})
          </h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {analytics.recentFeedback.map((feedback, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getTypeBadge(feedback.type)}
                      {getSentimentBadge(feedback.sentiment)}
                      {getPriorityBadge(feedback.priority)}
                      {getStatusBadge(feedback.status)}
                      {feedback.upvotes > 0 && (
                        <Badge variant="info">{feedback.upvotes} 👍</Badge>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {feedback.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {feedback.message.length > 150 ? `${feedback.message.substring(0, 150)}...` : feedback.message}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{formatTimeAgo(feedback.createdAt)}</span>
                      {feedback.userEmail && <span>👤 {feedback.userEmail}</span>}
                      {feedback.page && <span>📍 {feedback.page}</span>}
                      {feedback.rating && <StarDisplay rating={feedback.rating} />}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setSelectedFeedback(feedback)}
                      variant="outline"
                      size="sm"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Feedback Details</h3>
                <Button onClick={() => setSelectedFeedback(null)} variant="outline" size="sm">
                  ✕ Close
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  {getTypeBadge(selectedFeedback.type)}
                  {getSentimentBadge(selectedFeedback.sentiment)}
                  {getPriorityBadge(selectedFeedback.priority)}
                  {getStatusBadge(selectedFeedback.status)}
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Title</h4>
                  <p className="text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    {selectedFeedback.title}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Message</h4>
                  <p className="text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    {selectedFeedback.message}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Details</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Category:</strong> {getCategoryIcon(selectedFeedback.category)} {selectedFeedback.category}</p>
                      <p><strong>Created:</strong> {new Date(selectedFeedback.createdAt).toLocaleString()}</p>
                      {selectedFeedback.rating && <StarDisplay rating={selectedFeedback.rating} />}
                      {selectedFeedback.upvotes > 0 && <p><strong>Upvotes:</strong> {selectedFeedback.upvotes} 👍</p>}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">User Context</h4>
                    <div className="text-sm space-y-1">
                      {selectedFeedback.userEmail && <p><strong>User:</strong> {selectedFeedback.userEmail}</p>}
                      {selectedFeedback.page && <p><strong>Page:</strong> {selectedFeedback.page}</p>}
                      {selectedFeedback.screenResolution && <p><strong>Screen:</strong> {selectedFeedback.screenResolution}</p>}
                    </div>
                  </div>
                </div>
                
                {selectedFeedback.adminNotes && (
                  <div>
                    <h4 className="font-medium mb-2">Admin Notes</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                      {selectedFeedback.adminNotes}
                    </p>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => updateFeedback(selectedFeedback.id, { 
                      status: selectedFeedback.status === 'new' ? 'acknowledged' : 'resolved',
                      adminNotes: selectedFeedback.status === 'new' ? 'Acknowledged by admin' : 'Resolved by admin'
                    })}
                    variant="primary"
                    disabled={updatingFeedback === selectedFeedback.id}
                  >
                    {updatingFeedback === selectedFeedback.id ? <LoadingSpinner size="sm" /> : 
                     selectedFeedback.status === 'new' ? 'Acknowledge' : 'Mark Resolved'}
                  </Button>
                  {selectedFeedback.priority !== 'high' && (
                    <Button
                      onClick={() => updateFeedback(selectedFeedback.id, { priority: 'high' })}
                      variant="warning"
                      disabled={updatingFeedback === selectedFeedback.id}
                    >
                      Set High Priority
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Feedback Trends */}
      {analytics.trends.dailyFeedback.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">📈</span>
              Daily Feedback Trends (Last 7 Days)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Total Feedback</th>
                    <th className="text-right p-3">Avg Rating</th>
                    <th className="text-right p-3">Positive</th>
                    <th className="text-right p-3">Negative</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.trends.dailyFeedback.map((day, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-3 font-medium">{day.date}</td>
                      <td className="p-3 text-right">{day.count}</td>
                      <td className="p-3 text-right">
                        {day.averageRating > 0 ? `${day.averageRating.toFixed(1)}⭐` : 'N/A'}
                      </td>
                      <td className="p-3 text-right text-green-600">{day.positiveCount}</td>
                      <td className="p-3 text-right text-red-600">{day.negativeCount}</td>
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