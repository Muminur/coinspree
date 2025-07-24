'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { ConfirmModal } from '@/components/ui/Modal'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { DateUtils } from '@/lib/utils'

interface User {
  id: string
  email: string
  role: 'user' | 'admin'
}

interface AccountSettingsProps {
  user: User
}

export function AccountSettings({ user }: AccountSettingsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleExportData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/user/export-data')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `coinspree-data-${DateUtils.formatDate(new Date())}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to export data. Please try again.')
      }
    } catch (error) {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Account deleted successfully. You will be redirected to the home page.')
        window.location.href = '/'
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete account. Please try again.')
      }
    } catch (error) {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Data Export */}
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div>
          <h3 className="font-medium text-blue-900">Export Your Data</h3>
          <p className="text-sm text-blue-700">
            Download a copy of all your account data and settings
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handleExportData}
          loading={loading}
        >
          📥 Export Data
        </Button>
      </div>

      {/* Account Information */}
      <Alert variant="info">
        <div className="space-y-2">
          <p><strong>Account Created:</strong> Recently</p>
          <p><strong>Last Login:</strong> Currently active</p>
          <p><strong>Account Type:</strong> {user.role === 'admin' ? 'Administrator' : 'Standard User'}</p>
        </div>
      </Alert>

      {/* Appearance Settings */}
      <div className="p-4 border border-border rounded-lg">
        <h3 className="font-medium mb-4">🎨 Appearance</h3>
        <div className="space-y-4">
          <ThemeToggle variant="dropdown" showLabels={true} />
        </div>
      </div>

      {/* Privacy & Notification Settings */}
      <div className="p-4 border border-border rounded-lg">
        <h3 className="font-medium mb-4">🔔 Privacy & Notifications</h3>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Email notifications for ATH alerts</span>
            <span className="text-green-600">✅ Enabled</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Marketing communications</span>
            <span className="text-red-600">❌ Disabled</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Data sharing with partners</span>
            <span className="text-red-600">❌ Disabled</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <Alert variant="error">
        <div>
          <h4 className="font-medium mb-2">Danger Zone</h4>
          <p className="text-sm mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
            size="sm"
          >
            🗑️ Delete Account
          </Button>
        </div>
      </Alert>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
        confirmText="Delete Account"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}