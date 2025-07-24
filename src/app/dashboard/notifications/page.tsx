import { Auth } from '@/lib/auth'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'
import { NotificationHistory } from '@/components/notifications/NotificationHistory'
import { TestNotification } from '@/components/notifications/TestNotification'

export default async function NotificationsPage() {
  const session = await Auth.requireAuth()

  return (
    <MainLayout showSidebar>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
          <p className="text-muted-foreground">
            Manage your ATH notification preferences and history
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Notification Preferences */}
          <Card>
            <CardHeader
              title="Preferences"
              description="Configure when and how you receive notifications"
            />
            <NotificationPreferences userId={session.userId} />
          </Card>

          {/* Test Notification */}
          <Card>
            <CardHeader
              title="Test Notifications"
              description="Send yourself a test notification"
            />
            <TestNotification userId={session.userId} />
          </Card>
        </div>

        {/* Notification History */}
        <Card>
          <CardHeader
            title="Notification History"
            description="Your recent ATH notification history"
          />
          <NotificationHistory userId={session.userId} />
        </Card>
      </div>
    </MainLayout>
  )
}