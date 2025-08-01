'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface NotificationPreferencesProps {
  className?: string
  userId: string
}

interface PreferencesData {
  notificationsEnabled: boolean
  userId: string
  email: string
}

interface SubscriptionData {
  hasActiveSubscription: boolean
  subscription?: {
    status: string
    endDate: string
  }
}

export function NotificationPreferences({
  className,
  userId,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<PreferencesData | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load both preferences and subscription status
      const [preferencesResponse, subscriptionResponse] = await Promise.all([
        fetch('/api/notifications/preferences'),
        fetch('/api/subscription/status')
      ])

      const preferencesResult = await preferencesResponse.json()
      const subscriptionResult = await subscriptionResponse.json()

      if (!preferencesResult.success) {
        throw new Error(preferencesResult.error || 'Failed to load preferences')
      }

      setPreferences(preferencesResult.data)
      
      // Set subscription data
      setSubscription({
        hasActiveSubscription: subscriptionResult.success && subscriptionResult.data?.isActive === true,
        subscription: subscriptionResult.data
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load preferences'
      )
    } finally {
      setLoading(false)
    }
  }

  const updatePreferences = async (notificationsEnabled: boolean) => {
    try {
      setUpdating(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationsEnabled }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to update preferences')
      }

      setPreferences((prev) =>
        prev ? { ...prev, notificationsEnabled } : null
      )
      setSuccessMessage(result.data.message)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update preferences'
      )
    } finally {
      setUpdating(false)
    }
  }

  const handleToggle = () => {
    if (!preferences || !subscription) return
    
    // Prevent enabling notifications for non-subscribers
    if (!subscription.hasActiveSubscription && !preferences.notificationsEnabled) {
      setError('Active subscription required to enable notifications')
      return
    }
    
    updatePreferences(!preferences.notificationsEnabled)
  }

  if (loading) {
    return (
      <div className={`crypto-card p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded mb-4 w-1/3"></div>
          <div className="h-4 bg-muted rounded mb-2 w-2/3"></div>
          <div className="h-10 bg-muted rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`crypto-card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Notification Preferences</h3>
        {preferences?.notificationsEnabled && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Enabled
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm">
          {successMessage}
        </div>
      )}

      {preferences && subscription && (
        <div className="space-y-4">
          {/* Subscription Status Alert */}
          {!subscription.hasActiveSubscription && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                  🔔 Subscription Required
                </h4>
              </div>
              <p className="text-amber-700 dark:text-amber-300 text-sm mb-4">
                You need an active subscription to receive ATH notifications. Our notification service helps you never miss another all-time high!
              </p>
              <div className="flex items-center space-x-3">
                <Link href="/subscription">
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg"
                  >
                    🚀 Subscribe Now
                  </Button>
                </Link>
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  Starting at $3 USDT/month
                </span>
              </div>
            </div>
          )}

          <div className="flex items-start space-x-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notifications-enabled"
                checked={preferences.notificationsEnabled}
                onChange={handleToggle}
                disabled={updating || !subscription.hasActiveSubscription}
                className="h-4 w-4 text-primary focus:ring-primary border-border rounded disabled:opacity-50"
              />
              <label
                htmlFor="notifications-enabled"
                className={`text-sm font-medium leading-none ${
                  !subscription.hasActiveSubscription 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                }`}
              >
                Enable ATH Notifications
                {!subscription.hasActiveSubscription && (
                  <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                    (Requires subscription)
                  </span>
                )}
              </label>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              When enabled, you&apos;ll receive email notifications when
              cryptocurrencies hit new all-time highs. Requires an active
              subscription.
            </p>
            <div className="pl-4 space-y-1">
              <p>• Real-time notifications for all top 100 cryptocurrencies</p>
              <p>
                • Professional email templates with detailed ATH information
              </p>
              <p>
                • Frequency control to prevent spam (max 1 per coin per 5
                minutes)
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email Address:</span>
              <span className="font-medium">{preferences.email}</span>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            {subscription.hasActiveSubscription ? (
              <Button
                variant={
                  preferences.notificationsEnabled ? 'destructive' : 'primary'
                }
                onClick={handleToggle}
                loading={updating}
                size="sm"
              >
                {preferences.notificationsEnabled ? 'Disable' : 'Enable'}{' '}
                Notifications
              </Button>
            ) : (
              <Link href="/subscription">
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  🔔 Subscribe to Enable
                </Button>
              </Link>
            )}

            <Button
              variant="secondary"
              onClick={loadPreferences}
              disabled={updating}
              size="sm"
            >
              Refresh
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
