'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/components/auth/LogoutButton'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentPath, setCurrentPath] = useState('')

  useEffect(() => {
    setCurrentPath(window?.location?.pathname || '')
  }, [])

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  const adminNavItems = [
    { path: '/admin', label: '👑 Dashboard', icon: '🏠' },
    { path: '/admin/users', label: 'User Management', icon: '👥' },
    { path: '/admin/subscriptions', label: 'Subscriptions', icon: '💳' },
    { path: '/admin/pending-payments', label: 'Pending Payments', icon: '⏳' },
    { path: '/admin/analytics', label: 'Analytics', icon: '📊' },
    { path: '/admin/config', label: 'System Config', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Admin Header */}
      <header className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">👑</span>
              <h1 className="text-xl font-bold text-white">CoinSpree Admin</h1>
            </div>
            <div className="hidden sm:flex items-center space-x-1">
              {adminNavItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPath === item.path
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-white/90 text-sm">
              <span className="font-medium">{user.email}</span>
              <span className="ml-2 px-2 py-1 bg-white/20 rounded text-xs">ADMIN</span>
            </div>
            <LogoutButton className="bg-white/20 hover:bg-white/30 text-white border-white/30" />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="sm:hidden bg-black/10">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {adminNavItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  currentPath === item.path
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}