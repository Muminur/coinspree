'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface LogoutButtonProps {
  className?: string
  variant?: 'primary' | 'secondary' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  children?: React.ReactNode
  useSimpleAlert?: boolean // Option to use simple alert instead of toast
}

export function LogoutButton({ 
  className, 
  variant = 'secondary',
  size = 'md',
  children = 'Logout',
  useSimpleAlert = true // Default to simple alert for better compatibility
}: LogoutButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()

      if (result.success) {
        // Show success notification
        if (useSimpleAlert) {
          // Simple browser alert - works everywhere
          window.alert('✅ Successfully logged out!\n\nRedirecting to homepage...')
        }
        
        // Small delay to let user see the message
        setTimeout(() => {
          // Redirect to homepage
          router.push('/')
          router.refresh() // Force refresh to clear any cached auth state
        }, 500)
        
      } else {
        console.error('Logout failed:', result.error)
        window.alert('❌ Logout failed. Please try again.')
      }
    } catch (error) {
      console.error('Logout error:', error)
      window.alert('❌ Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleLogout} 
      loading={loading}
      variant={variant}
      size={size}
      className={className}
      disabled={loading}
    >
      {loading ? 'Logging out...' : children}
    </Button>
  )
}