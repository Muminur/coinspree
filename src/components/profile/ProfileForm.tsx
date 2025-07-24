'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/Alert'

interface User {
  id: string
  email: string
  role: 'user' | 'admin'
}

interface ProfileFormProps {
  user: User
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [email, setEmail] = useState(user.email)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' })
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
            Email Address
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Account Role
          </label>
          <Input
            value={user.role}
            disabled
            className="bg-muted"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Contact support to change your account role
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            User ID
          </label>
          <Input
            value={user.id}
            disabled
            className="bg-muted font-mono text-sm"
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
          Update Profile
        </Button>
      </div>
    </form>
  )
}