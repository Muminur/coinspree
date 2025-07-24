import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'ath'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  className?: string
}

export function Badge({
  variant = 'default',
  size = 'md',
  children,
  className,
}: BadgeProps) {
  const variants = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-green-100 text-green-800 border-green-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    ath: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white animate-pulse shadow-lg',
  }

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  )
}

interface ATHBadgeProps {
  isNewATH?: boolean
  className?: string
}

export function ATHBadge({ isNewATH = false, className }: ATHBadgeProps) {
  if (isNewATH) {
    return (
      <Badge variant="ath" size="sm" className={className}>
        🚀 NEW ATH!
      </Badge>
    )
  }

  return null
}

interface StatusBadgeProps {
  status: 'active' | 'expired' | 'blocked' | 'pending'
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    active: { variant: 'success' as const, label: 'Active' },
    expired: { variant: 'error' as const, label: 'Expired' },
    blocked: { variant: 'error' as const, label: 'Blocked' },
    pending: { variant: 'warning' as const, label: 'Pending' },
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}