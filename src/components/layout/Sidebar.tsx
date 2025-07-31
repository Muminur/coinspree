'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()

  const menuItems = [
    {
      section: 'Overview',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: '📊' },
        { href: '/dashboard/notifications', label: 'Notifications', icon: '🔔' },
      ]
    },
    {
      section: 'Account',
      items: [
        { href: '/profile', label: 'Profile', icon: '👤' },
        { href: '/subscription', label: 'Subscription', icon: '💳' },
        { href: '/settings', label: 'Settings', icon: '⚙️' },
      ]
    },
    {
      section: 'Crypto Data',
      items: [
        { href: '/dashboard/top100', label: 'Top 100', icon: '🏆' },
        { href: '/dashboard/top101-200', label: 'Top 101-200', icon: '🥈' },
        { href: '/dashboard/ath-history', label: 'ATH History', icon: '📈' },
        { href: '/dashboard/favorites', label: 'Favorites', icon: '⭐' },
      ]
    }
  ]

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="h-full bg-card border-r border-border p-4">
      <div className="space-y-6">
        {menuItems.map((section) => (
          <div key={section.section}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {section.section}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}