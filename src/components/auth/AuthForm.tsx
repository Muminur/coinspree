'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface AuthFormProps {
  mode: 'login' | 'register'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData)

    try {
      console.log(`Submitting ${mode} form with:`, { 
        email: data.email, 
        hasPassword: !!data.password,
        hasConfirmPassword: !!data.confirmPassword,
        formDataKeys: Object.keys(data)
      })
      
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      console.log(`${mode} response:`, { success: result.success, error: result.error, hasFieldErrors: !!result.fieldErrors })

      if (result.success) {
        router.push('/dashboard')
        router.refresh()
      } else {
        // Handle field-specific validation errors
        if (result.fieldErrors) {
          setErrors(result.fieldErrors)
        } else {
          // Handle rate limiting with more helpful message
          if (result.error?.includes('Too many')) {
            setErrors({ 
              form: 'Too many attempts. Please wait a moment and try again. (In development, this resets quickly)' 
            })
          } else {
            // Fallback for general errors
            setErrors({ form: result.error })
          }
        }
      }
    } catch {
      setErrors({ form: 'An error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="crypto-card p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="email"
            type="email"
            placeholder="Email"
            required
            error={errors.email}
          />

          <div>
            <Input
              name="password"
              type="password"
              placeholder="Password"
              required
              error={errors.password}
            />
            {mode === 'register' && !errors.password && (
              <p className="text-xs text-muted-foreground mt-1">
                Password must be at least 8 characters with uppercase, lowercase, and a number
              </p>
            )}
          </div>

          {mode === 'register' && (
            <Input
              name="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              required
              error={errors.confirmPassword}
            />
          )}

          {errors.form && (
            <p className="text-sm text-destructive text-center">
              {errors.form}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground mt-4 space-y-2">
          <p>
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <a href="/register" className="text-primary hover:underline">
                  Sign up
                </a>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <a href="/login" className="text-primary hover:underline">
                  Sign in
                </a>
              </>
            )}
          </p>
          {mode === 'login' && (
            <p>
              <a
                href="/reset-password"
                className="text-primary hover:underline"
              >
                Forgot your password?
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
