'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import type { NotificationLog } from '@/types'

interface NotificationHistoryProps {
  className?: string
  isAdmin?: boolean
  userId: string
}

interface HistoryData {
  notifications: NotificationLog[]
  count: number
  isAdmin: boolean
  stats?: {
    totalNotifications: number
    totalRecipients: number
    averageRecipientsPerNotification: number
    uniqueCryptos: number
  }
}

export function NotificationHistory({
  className,
  isAdmin = false,
  userId,
}: NotificationHistoryProps) {
  const [data, setData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(20)

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(isAdmin && { admin: 'true', hours: '168' }), // 7 days for admin
      })

      const response = await fetch(`/api/notifications/history?${params}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to load notification history')
      }

      setData(result.data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load notification history'
      )
    } finally {
      setLoading(false)
    }
  }, [limit, isAdmin])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  const calculatePercentageIncrease = (newATH: number, previousATH: number) => {
    if (!newATH || !previousATH || previousATH === 0) return 0
    return ((newATH - previousATH) / previousATH) * 100
  }

  if (loading) {
    return (
      <div className={`crypto-card p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`crypto-card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">
          {isAdmin ? 'All Notifications' : 'Your Notification History'}
        </h3>
        <div className="flex items-center space-x-2">
          {!isAdmin && (
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="text-sm border border-border rounded px-2 py-1 bg-background"
            >
              <option value={10}>Last 10</option>
              <option value={20}>Last 20</option>
              <option value={50}>Last 50</option>
            </select>
          )}
          <Button variant="secondary" size="sm" onClick={loadHistory}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {data?.stats && isAdmin && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-md bg-muted/50 border border-border">
            <div className="text-sm text-muted-foreground">
              Total Notifications
            </div>
            <div className="text-lg font-semibold">
              {data.stats.totalNotifications}
            </div>
          </div>
          <div className="p-3 rounded-md bg-muted/50 border border-border">
            <div className="text-sm text-muted-foreground">
              Total Recipients
            </div>
            <div className="text-lg font-semibold">
              {data.stats.totalRecipients}
            </div>
          </div>
          <div className="p-3 rounded-md bg-muted/50 border border-border">
            <div className="text-sm text-muted-foreground">Avg Recipients</div>
            <div className="text-lg font-semibold">
              {data.stats.averageRecipientsPerNotification}
            </div>
          </div>
          <div className="p-3 rounded-md bg-muted/50 border border-border">
            <div className="text-sm text-muted-foreground">Unique Cryptos</div>
            <div className="text-lg font-semibold">
              {data.stats.uniqueCryptos}
            </div>
          </div>
        </div>
      )}

      {data && data.notifications.length > 0 ? (
        <div className="space-y-3">
          {data.notifications.map((notification) => {
            const percentageIncrease = calculatePercentageIncrease(
              notification.newATH,
              notification.previousATH
            )

            return (
              <div
                key={notification.id}
                className="p-4 rounded-md border border-border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="font-medium">
                      {notification.cryptoId.toUpperCase()}
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      +{(percentageIncrease || 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(notification.sentAt)}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">New ATH</div>
                    <div className="font-medium text-green-600 dark:text-green-400">
                      {formatPrice(notification.newATH)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Previous ATH</div>
                    <div className="font-medium">
                      {formatPrice(notification.previousATH)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Recipients</div>
                    <div className="font-medium">
                      {notification.recipientCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Notification ID</div>
                    <div className="font-mono text-xs">
                      {notification.id.substring(0, 8)}...
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          {data?.count === 0 ? (
            <div className="space-y-2">
              <div className="text-lg">No notifications yet</div>
              <div className="text-sm">
                {isAdmin
                  ? 'No ATH notifications have been sent in the last 7 days.'
                  : "You haven't received any ATH notifications yet. Make sure you have an active subscription and notifications enabled."}
              </div>
            </div>
          ) : (
            <div>Loading notification history...</div>
          )}
        </div>
      )}

      {data && data.count > 0 && !isAdmin && (
        <div className="mt-4 pt-4 border-t border-border text-center text-sm text-muted-foreground">
          Showing {data.count} most recent notifications
        </div>
      )}
    </div>
  )
}
