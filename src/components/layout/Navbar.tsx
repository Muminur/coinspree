'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { ThemeToggleCompact } from '@/components/ui/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()

  const navItems = [
    { href: '/', label: 'Home', public: true },
    { href: '/dashboard', label: 'Dashboard', requiresAuth: true },
    { href: '/subscription', label: 'Subscription', requiresAuth: true },
    { href: '/profile', label: 'Profile', requiresAuth: true },
  ]

  const adminItems = [
    { href: '/admin', label: 'Admin', requiresAdmin: true },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-gradient-to-r from-slate-900/95 via-blue-900/95 to-purple-900/95 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40 shadow-lg shadow-purple-500/10">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5"></div>
      <div className="container mx-auto px-4 relative">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-xl blur-lg opacity-30 group-hover:opacity-60 transition-opacity"></div>
              <div className="relative text-2xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 p-2 rounded-xl">
                🚀
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                CoinSpree
              </span>
              <span className="text-xs text-blue-300/80 font-medium">
                ATH Tracker
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navItems
              .filter(item => 
                item.public || 
                (item.requiresAuth && user)
              )
              .map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 group',
                  isActive(item.href)
                    ? 'text-white bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25'
                    : 'text-blue-100/80 hover:text-white hover:bg-white/10 backdrop-blur-sm'
                )}
              >
                <span className="relative z-10">{item.label}</span>
                {isActive(item.href) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl blur opacity-60"></div>
                )}
              </Link>
            ))}

            {/* Admin Links */}
            {user?.role === 'admin' && adminItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 group',
                  isActive(item.href)
                    ? 'text-white bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25'
                    : 'text-amber-200/80 hover:text-white hover:bg-gradient-to-r hover:from-amber-500/20 hover:to-orange-600/20 backdrop-blur-sm'
                )}
              >
                <span className="relative z-10">👑 {item.label}</span>
                {isActive(item.href) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl blur opacity-60"></div>
                )}
              </Link>
            ))}
          </div>

          {/* Theme Toggle & Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggleCompact />
            {loading ? (
              <div className="h-10 w-24 bg-white/10 animate-pulse rounded-xl backdrop-blur-sm" />
            ) : user ? (
              <Dropdown
                align="right"
                trigger={
                  <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-300 cursor-pointer border border-white/10">
                    <div className="relative">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-sm font-bold">
                          {user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900"></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">
                        {user.email}
                      </span>
                      <span className="text-xs text-blue-200/70">
                        {user.role === 'admin' ? 'Administrator' : 'Member'}
                      </span>
                    </div>
                    <svg className="w-4 h-4 text-blue-200/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                }
              >
                <DropdownItem
                  onClick={() => router.push('/profile')}
                >
                  👤 Profile
                </DropdownItem>
                <DropdownItem
                  onClick={() => router.push('/subscription')}
                >
                  💳 Subscription
                </DropdownItem>
                <DropdownItem
                  onClick={() => router.push('/settings')}
                >
                  ⚙️ Settings
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem
                  onClick={() => {
                    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                      .then(() => {
                        alert('Successfully logged out!')
                        window.location.href = '/'
                      })
                      .catch(() => {
                        alert('Logout failed. Please try again.')
                      })
                  }}
                  className="text-red-600 hover:bg-red-50"
                >
                  🚪 Logout
                </DropdownItem>
              </Dropdown>
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm" asChild className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm">
                  <Link href="/login">Login</Link>
                </Button>
                <Button size="sm" asChild className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25">
                  <Link href="/register">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div className="w-6 h-6 flex flex-col justify-around">
              <span className={cn(
                'block h-0.5 bg-white rounded-full transition-all duration-300',
                isMenuOpen && 'rotate-45 translate-y-2'
              )} />
              <span className={cn(
                'block h-0.5 bg-white rounded-full transition-all duration-300',
                isMenuOpen && 'opacity-0'
              )} />
              <span className={cn(
                'block h-0.5 bg-white rounded-full transition-all duration-300',
                isMenuOpen && '-rotate-45 -translate-y-2'
              )} />
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10 bg-white/5 backdrop-blur-sm rounded-b-2xl mt-2">
            <div className="space-y-2">
              {navItems
                .filter(item => 
                  item.public || 
                  (item.requiresAuth && user)
                )
                .map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {/* Mobile Theme Toggle */}
              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggleCompact />
                </div>
              </div>

              {/* Mobile Auth */}
              {user ? (
                <div className="pt-4 border-t border-border space-y-2">
                  <div className="px-3 text-sm text-muted-foreground">
                    {user.email}
                  </div>
                  <div className="px-3">
                    <LogoutButton size="sm" className="w-full" />
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t border-border space-y-2">
                  <Button variant="secondary" size="sm" className="w-full" asChild>
                    <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                      Login
                    </Link>
                  </Button>
                  <Button size="sm" className="w-full" asChild>
                    <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                      Sign Up
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}