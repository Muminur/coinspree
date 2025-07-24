import { redirect } from 'next/navigation'
import { validateServerSession } from '@/lib/auth'
import {
  NotificationPreferences,
  NotificationHistory,
  TestNotification,
} from '@/components/notifications'

export default async function NotificationsPage() {
  const session = await validateServerSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
          <p className="text-muted-foreground">
            Manage your ATH notification preferences and view your notification
            history.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
          {/* Notification Preferences */}
          <NotificationPreferences className="md:col-span-2 lg:col-span-1" />

          {/* Test Notification */}
          <div className="md:col-span-1 lg:col-span-1">
            <TestNotification />
          </div>

          {/* Notification History */}
          <div className="md:col-span-2 lg:col-span-1">
            <NotificationHistory />
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-8 crypto-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            About ATH Notifications
          </h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-foreground mb-2">
                  How it works
                </h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Real-time monitoring of top 100 cryptocurrencies</li>
                  <li>Instant email alerts when new ATHs are detected</li>
                  <li>
                    Professional email templates with detailed information
                  </li>
                  <li>Frequency control to prevent notification spam</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">
                  Requirements
                </h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Active subscription to receive notifications</li>
                  <li>Notifications must be enabled in your preferences</li>
                  <li>Valid email address for notification delivery</li>
                  <li>Subscription must not be expired or blocked</li>
                </ul>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-xs">
                Notifications are sent with a minimum interval of 5 minutes per
                cryptocurrency to prevent spam. All emails include an
                unsubscribe option that links back to these preferences.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
