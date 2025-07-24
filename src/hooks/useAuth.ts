'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  role: 'user' | 'admin'
}

interface UseAuthReturn {
  user: User | null
  loading: boolean
  refetch: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Important for cookies
      })
      if (response.ok) {
        const result = await response.json()
        // The API returns data: session, not user: session
        setUser(result.data || result.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  return {
    user,
    loading,
    refetch: fetchUser,
  }
}