'use client'

import { useState, useEffect } from 'react'
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

export function NotificationPreferences({
  className,
  userId,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<PreferencesData | null>(null)
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

      const response = await fetch('/api/notifications/preferences')
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to load preferences')
      }

      setPreferences(result.data)
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
    if (!preferences) return
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

      {preferences && (
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notifications-enabled"
                checked={preferences.notificationsEnabled}
                onChange={handleToggle}
                disabled={updating}
                className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
              />
              <label
                htmlFor="notifications-enabled"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Enable ATH Notifications
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
