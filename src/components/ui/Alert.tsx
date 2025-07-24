import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: ReactNode
  className?: string
}

export function Alert({
  variant = 'info',
  title,
  children,
  className,
}: AlertProps) {
  const variants = {
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: 'ℹ️',
      iconColor: 'text-blue-500',
    },
    success: {
      container: 'bg-green-50 border-green-200 text-green-800',
      icon: '✅',
      iconColor: 'text-green-500',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: '⚠️',
      iconColor: 'text-yellow-500',
    },
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: '❌',
      iconColor: 'text-red-500',
    },
  }

  const config = variants[variant]

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config.container,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('text-lg', config.iconColor)}>
          {config.icon}
        </span>
        <div className="flex-1">
          {title && (
            <h4 className="font-medium mb-1">{title}</h4>
          )}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  )
}

interface InlineAlertProps {
  variant?: 'success' | 'error' | 'warning'
  message: string
  className?: string
}

export function InlineAlert({ variant = 'error', message, className }: InlineAlertProps) {
  const variants = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
  }

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm', variants[variant], className)}>
      <span>{icons[variant]}</span>
      <span>{message}</span>
    </div>
  )
}