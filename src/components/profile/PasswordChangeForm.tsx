'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/Alert'

export function PasswordChangeForm() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required'
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required'
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters'
    }

    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully!' })
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        if (data.fieldErrors) {
          setErrors(data.fieldErrors)
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to change password' })
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Current Password
          </label>
          <Input
            type="password"
            value={formData.currentPassword}
            onChange={(e) => handleChange('currentPassword', e.target.value)}
            error={errors.currentPassword}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            New Password
          </label>
          <Input
            type="password"
            value={formData.newPassword}
            onChange={(e) => handleChange('newPassword', e.target.value)}
            error={errors.newPassword}
            required
          />
          <div className="text-sm text-muted-foreground mt-1 space-y-1">
            <p>Password requirements:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>At least 8 characters long</li>
              <li>Include uppercase and lowercase letters</li>
              <li>Include at least one number</li>
            </ul>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Confirm New Password
          </label>
          <Input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
            required
          />
        </div>
      </div>

      {message && (
        <InlineAlert
          variant={message.type === 'success' ? 'success' : 'error'}
          message={message.text}
        />
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          Change Password
        </Button>
      </div>
    </form>
  )
}