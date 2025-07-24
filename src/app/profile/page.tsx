import { Auth } from '@/lib/auth'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { PasswordChangeForm } from '@/components/profile/PasswordChangeForm'
import { AccountSettings } from '@/components/profile/AccountSettings'

export default async function ProfilePage() {
  const session = await Auth.requireAuth()

  return (
    <MainLayout showSidebar>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white text-2xl">
              ⚙️
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1">Profile Settings</h1>
              <p className="text-muted-foreground">
                Manage your account, appearance, and preferences
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <Card>
            <CardHeader
              title="Profile Information"
              description="Update your email and personal details"
            />
            <ProfileForm user={session} />
          </Card>

          {/* Password Settings */}
          <Card>
            <CardHeader
              title="Password & Security"
              description="Change your password and security settings"
            />
            <PasswordChangeForm />
          </Card>
        </div>

        {/* Account Settings */}
        <Card>
          <CardHeader
            title="Account Settings"
            description="Manage your account preferences and data"
          />
          <AccountSettings user={session} />
        </Card>
      </div>
    </MainLayout>
  )
}