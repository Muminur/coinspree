'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface UnsubscribeData {
  email: string
  notificationsEnabled: boolean
  token: string
}

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [data, setData] = useState<UnsubscribeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [unsubscribing, setUnsubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('No unsubscribe token provided')
      setLoading(false)
      return
    }

    loadUnsubscribeData()
  }, [token]) // loadUnsubscribeData is stable

  const loadUnsubscribeData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/unsubscribe?token=${token}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to load unsubscribe data')
      }

      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    if (!token) return

    try {
      setUnsubscribing(true)
      setError(null)

      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to unsubscribe')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe')
    } finally {
      setUnsubscribing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="crypto-card p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              Loading unsubscribe information...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="crypto-card p-8 text-center">
            <div className="text-green-600 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">
              Successfully Unsubscribed
            </h1>
            <p className="text-muted-foreground mb-6">
              You have been unsubscribed from CoinSpree notifications.
              {data && (
                <>
                  <br />
                  <span className="font-medium">{data.email}</span> will no
                  longer receive ATH alerts.
                </>
              )}
            </p>
            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={() => (window.location.href = '/')}
                className="w-full"
              >
                Return to Homepage
              </Button>
              <p className="text-xs text-muted-foreground">
                You can re-enable notifications anytime by logging into your
                account.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="crypto-card p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">
              Unsubscribe from Notifications
            </h1>
            <p className="text-muted-foreground">
              Manage your CoinSpree email notification preferences
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
              <h3 className="font-medium mb-1">Error</h3>
              <p>{error}</p>
              {error.includes('expired') && (
                <p className="mt-2">
                  Please log into your account to manage notification
                  preferences.
                </p>
              )}
            </div>
          )}

          {data && !error && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Account:</p>
                <p className="font-medium">{data.email}</p>
              </div>

              <div className="bg-muted/50 rounded-md p-4">
                <h3 className="font-medium mb-2">Current Status</h3>
                <p className="text-sm">
                  Notifications are currently{' '}
                  <span
                    className={
                      data.notificationsEnabled
                        ? 'text-green-600 font-medium'
                        : 'text-red-600 font-medium'
                    }
                  >
                    {data.notificationsEnabled ? 'enabled' : 'disabled'}
                  </span>
                </p>
              </div>

              {data.notificationsEnabled ? (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>By unsubscribing, you will:</p>
                    <ul className="list-disc list-inside pl-4 space-y-1">
                      <li>Stop receiving ATH notification emails</li>
                      <li>Stop receiving subscription expiry reminders</li>
                      <li>Keep your account and subscription active</li>
                    </ul>
                  </div>

                  <Button
                    variant="destructive"
                    onClick={handleUnsubscribe}
                    loading={unsubscribing}
                    className="w-full"
                  >
                    {unsubscribing
                      ? 'Unsubscribing...'
                      : 'Unsubscribe from Notifications'}
                  </Button>

                  <div className="text-center">
                    <Button
                      variant="secondary"
                      onClick={() => (window.location.href = '/notifications')}
                      size="sm"
                    >
                      Manage Preferences Instead
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    You are already unsubscribed from notifications.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => (window.location.href = '/notifications')}
                    className="w-full"
                  >
                    Re-enable Notifications
                  </Button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-center">
              <Button
                variant="secondary"
                onClick={() => (window.location.href = '/')}
              >
                Return to Homepage
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="crypto-card p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              Loading...
            </p>
          </div>
        </div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
