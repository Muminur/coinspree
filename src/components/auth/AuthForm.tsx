'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAnalytics } from '@/hooks/useAnalytics'

interface AuthFormProps {
  mode: 'login' | 'register'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const { trackUserAction, trackConversion } = useAnalytics()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const lastSubmitTime = useRef<number>(0)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Store form reference before async operations
    const form = e.currentTarget
    
    // Prevent double submissions with multiple safeguards
    if (loading) return
    
    // Debounce mechanism - prevent submissions within 500ms (reduced from 1 second)
    const now = Date.now()
    if (now - lastSubmitTime.current < 500) {
      console.log('Form submission blocked - too soon after last attempt')
      setErrors({ form: 'Please wait a moment before trying again.' })
      return
    }
    lastSubmitTime.current = now
    
    setLoading(true)
    setErrors({})

    const formData = new FormData(form)
    const data = Object.fromEntries(formData)

    // Track authentication attempt
    trackUserAction(`${mode}_attempt`, {
      email: data.email,
      hasConfirmPassword: mode === 'register' ? !!data.confirmPassword : undefined
    })

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

      console.log(`${mode} response status:`, response.status, response.statusText)
      const result = await response.json()
      console.log(`${mode} response:`, { success: result.success, error: result.error, hasFieldErrors: !!result.fieldErrors, fullResult: result })

      if (result.success) {
        // Track successful authentication
        trackConversion(`${mode}_success`, {
          email: data.email,
          redirectTo: '/dashboard'
        })
        
        // Reset form and redirect
        form.reset()
        
        // Use window.location for more reliable redirect in production
        if (typeof window !== 'undefined') {
          window.location.href = '/dashboard'
        } else {
          router.replace('/dashboard')
        }
        
        // Don't set loading to false - keep it true until redirect completes
        return
      } else {
        // Track authentication failure
        trackUserAction(`${mode}_failure`, {
          email: data.email,
          errorType: result.fieldErrors ? 'validation' : 'server',
          error: result.error
        })

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
    } catch (error) {
      console.error(`${mode} catch block error:`, error)
      
      // Track network/system errors
      trackUserAction(`${mode}_error`, {
        email: data.email,
        errorType: 'network',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.'
      console.log('Setting error message:', errorMessage)
      setErrors({ form: errorMessage })
    } finally {
      // Only set loading to false if we're not redirecting (success case returns early)
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
