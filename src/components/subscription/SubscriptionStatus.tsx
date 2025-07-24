'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { DateUtils } from '@/lib/utils'
import Link from 'next/link'

interface Subscription {
  id: string
  status: 'active' | 'expired' | 'blocked'
  startDate: string
  endDate: string
  amount: number
}

export function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscriptionStatus()
  }, [])

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/subscription/status', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data.hasSubscription) {
          // Convert API response to subscription format
          const subscriptionData = {
            id: result.data.id || 'subscription-1',
            status: result.data.status,
            startDate: result.data.startDate,
            endDate: result.data.endDate,
            amount: result.data.amount || 0
          }
          setSubscription(subscriptionData)
        } else {
          setSubscription(null)
        }
      } else if (response.status === 404) {
        setSubscription(null)
      } else {
        throw new Error('Failed to fetch subscription status')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="error">
        <div>
          <p>{error}</p>
          <Button onClick={fetchSubscriptionStatus} className="mt-2" size="sm">
            Try Again
          </Button>
        </div>
      </Alert>
    )
  }

  if (!subscription) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">💳</div>
        <h3 className="text-lg font-medium mb-2">No Active Subscription</h3>
        <p className="text-muted-foreground mb-6">
          Subscribe to start receiving ATH notifications for the top 100 cryptocurrencies.
        </p>
        <Link href="/subscription#plans" className="btn-primary px-6 py-2">
          Choose a Plan
        </Link>
      </div>
    )
  }

  const isExpired = DateUtils.isSubscriptionExpired(subscription.endDate)
  const daysUntilExpiration = DateUtils.getDaysUntilExpiration(subscription.endDate)

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="flex items-center justify-between p-6 bg-muted/50 rounded-lg">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StatusBadge status={subscription.status} />
            {subscription.status === 'active' && !isExpired && (
              <span className="text-sm text-muted-foreground">
                {daysUntilExpiration > 0 
                  ? `Expires in ${daysUntilExpiration} days`
                  : 'Expires today'
                }
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Subscription ID: {subscription.id}
          </p>
        </div>
        
        <div className="text-right">
          <p className="font-medium">${subscription.amount} USDT</p>
          <p className="text-sm text-muted-foreground">Monthly</p>
        </div>
      </div>

      {/* Subscription Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Subscription Period</h4>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Started:</span>{' '}
                {DateUtils.formatDate(subscription.startDate)}
              </p>
              <p>
                <span className="text-muted-foreground">Expires:</span>{' '}
                {DateUtils.formatDate(subscription.endDate)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Features Included</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✅ Real-time ATH notifications</li>
              <li>✅ Email alerts for top 100 cryptos</li>
              <li>✅ Historical ATH data access</li>
              <li>✅ Priority customer support</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Expiration Warning */}
      {subscription.status === 'active' && daysUntilExpiration <= 7 && daysUntilExpiration > 0 && (
        <Alert variant="warning">
          <div>
            <p className="font-medium">Subscription Expiring Soon</p>
            <p>Your subscription expires in {daysUntilExpiration} days. Renew now to continue receiving notifications.</p>
            <Button className="mt-3" size="sm" asChild>
              <Link href="/subscription/renew">
                Renew Subscription
              </Link>
            </Button>
          </div>
        </Alert>
      )}

      {/* Expired Warning */}
      {isExpired && (
        <Alert variant="error">
          <div>
            <p className="font-medium">Subscription Expired</p>
            <p>Your subscription expired on {DateUtils.formatDate(subscription.endDate)}. Renew to continue receiving notifications.</p>
            <Button className="mt-3" size="sm" asChild>
              <Link href="/subscription/renew">
                Renew Now
              </Link>
            </Button>
          </div>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button variant="secondary" asChild>
          <Link href="/subscription/renew">
            🔄 Renew Subscription
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/dashboard/notifications">
            ⚙️ Notification Settings
          </Link>
        </Button>
      </div>
    </div>
  )
}