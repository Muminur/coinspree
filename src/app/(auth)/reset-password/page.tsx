'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState<'request' | 'reset'>('request')

  useEffect(() => {
    if (token) {
      setStep('reset')
    }
  }, [token])

  const handleRequestReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
      } else {
        setErrors({ form: result.error })
      }
    } catch {
      setErrors({ form: 'An error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    const formData = new FormData(e.currentTarget)
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' })
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        setTimeout(() => router.push('/login'), 2000)
      } else {
        setErrors({ form: result.error })
      }
    } catch {
      setErrors({ form: 'An error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="crypto-card p-8 text-center">
            <h1 className="text-2xl font-bold mb-4 text-success">
              {step === 'request' ? 'Reset Email Sent!' : 'Password Reset!'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {step === 'request'
                ? 'If an account exists with that email, you will receive reset instructions.'
                : 'Your password has been reset successfully. Redirecting to login...'}
            </p>
            <a href="/login" className="btn-primary">
              Back to Login
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="crypto-card p-8">
          <h1 className="text-2xl font-bold text-center mb-6">
            {step === 'request' ? 'Reset Password' : 'Create New Password'}
          </h1>

          {step === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <Input
                name="email"
                type="email"
                placeholder="Enter your email"
                required
                error={errors.email}
              />

              {errors.form && (
                <p className="text-sm text-destructive text-center">
                  {errors.form}
                </p>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Send Reset Email
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Input
                name="newPassword"
                type="password"
                placeholder="New Password"
                required
                error={errors.newPassword}
              />

              <Input
                name="confirmPassword"
                type="password"
                placeholder="Confirm New Password"
                required
                error={errors.confirmPassword}
              />

              {errors.form && (
                <p className="text-sm text-destructive text-center">
                  {errors.form}
                </p>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Reset Password
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-4">
            Remember your password?{' '}
            <a href="/login" className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
