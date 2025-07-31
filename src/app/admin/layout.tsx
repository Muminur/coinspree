'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/components/auth/LogoutButton'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  const adminNavGroups = [
    {
      title: "Dashboard",
      items: [
        { path: '/admin', label: 'Dashboard', icon: '🏠' },
      ]
    },
    {
      title: "User Management",
      items: [
        { path: '/admin/users', label: 'Users', icon: '👥' },
        { path: '/admin/subscriptions', label: 'Subscriptions', icon: '💳' },
        { path: '/admin/pending-payments', label: 'Pending Payments', icon: '⏳' },
      ]
    },
    {
      title: "Analytics",
      items: [
        { path: '/admin/analytics', label: 'Analytics', icon: '📊' },
        { path: '/admin/subscription-analytics', label: 'Subscription Analytics', icon: '💰' },
        { path: '/admin/email-analytics', label: 'Email Analytics', icon: '📧' },
      ]
    },
    {
      title: "Monitoring",
      items: [
        { path: '/admin/monitoring', label: 'Performance Monitor', icon: '🔧' },
        { path: '/admin/error-tracking', label: 'Error Tracking', icon: '🐛' },
        { path: '/admin/performance-alerts', label: 'Performance Alerts', icon: '🚨' },
      ]
    },
    {
      title: "System",
      items: [
        { path: '/admin/feedback', label: 'User Feedback', icon: '💬' },
        { path: '/admin/cache-management', label: 'Cache Management', icon: '🚀' },
        { path: '/admin/ab-testing', label: 'A/B Testing', icon: '🧪' },
        { path: '/admin/config', label: 'System Config', icon: '⚙️' },
      ]
    }
  ]

  // Flatten for mobile menu
  const allNavItems = adminNavGroups.flatMap(group => group.items)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Admin Header */}
      <header className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <span className="text-2xl">👑</span>
                <h1 className="text-lg sm:text-xl font-bold text-white">CoinSpree Admin</h1>
              </Link>
            </div>

            <div className="flex items-center space-x-2">
              {/* User Info - Responsive */}
              <div className="hidden sm:block text-white/90 text-sm">
                <span className="font-medium">{user.email}</span>
                <span className="ml-2 px-2 py-1 bg-white/20 rounded text-xs">ADMIN</span>
              </div>
              <div className="sm:hidden text-white/90 text-sm">
                <span className="px-2 py-1 bg-white/20 rounded text-xs">ADMIN</span>
              </div>
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden bg-white/20 hover:bg-white/30 text-white p-2 rounded-md transition-colors"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
              <div className="hidden sm:block">
                <LogoutButton className="bg-white/20 hover:bg-white/30 text-white border-white/30" />
              </div>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-black/10 border-t border-white/10">
              <div className="px-2 pt-2 pb-3 space-y-1 max-h-96 overflow-y-auto">
                {allNavItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-3 rounded-md text-base font-medium transition-colors ${
                      pathname === item.path
                        ? 'bg-white/20 text-white'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
                {/* Mobile Logout */}
                <div className="pt-3 border-t border-white/10 mt-3">
                  <div className="px-3 py-2 text-white/70 text-sm">
                    {user.email}
                  </div>
                  <div className="px-3">
                    <LogoutButton className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sub Navigation - Grouped Menu */}
        <div className="hidden md:block bg-black/10 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-3 space-y-2">
              {/* First Row: User Management and Analytics */}
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-1">
                  <span className="text-white/70 text-xs font-medium mr-3 min-w-[120px]">User Management:</span>
                  <div className="flex items-center space-x-1">
                    {adminNavGroups[1].items.map((item) => (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                          pathname === item.path
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
                <div className="flex items-center space-x-1">
                  <span className="text-white/70 text-xs font-medium mr-3 min-w-[100px]">Analytics:</span>
                  <div className="flex items-center space-x-1">
                    {adminNavGroups[2].items.map((item) => (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                          pathname === item.path
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
              </div>

              {/* Second Row: Monitoring and System */}
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-1">
                  <span className="text-white/70 text-xs font-medium mr-3 min-w-[120px]">Monitoring:</span>
                  <div className="flex items-center space-x-1">
                    {adminNavGroups[3].items.map((item) => (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                          pathname === item.path
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
                <div className="flex items-center space-x-1">
                  <span className="text-white/70 text-xs font-medium mr-3 min-w-[100px]">System:</span>
                  <div className="flex items-center space-x-1">
                    {adminNavGroups[4].items.map((item) => (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                          pathname === item.path
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
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}