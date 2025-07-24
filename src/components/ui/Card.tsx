import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        'crypto-card',
        padding && 'p-6',
        className
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title?: string
  description?: string
  action?: ReactNode
  className?: string
  children?: ReactNode
}

export function CardHeader({
  title,
  description,
  action,
  className,
  children,
}: CardHeaderProps) {
  if (children) {
    return (
      <div className={cn('mb-6', className)}>
        {children}
      </div>
    )
  }

  return (
    <div className={cn('flex items-start justify-between mb-6', className)}>
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

interface CardTitleProps {
  children: ReactNode
  className?: string
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>
      {children}
    </h3>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  icon?: ReactNode | string
  className?: string
  trend?: string
  description?: string
}

export function StatsCard({
  title,
  value,
  change,
  icon,
  className,
  trend,
  description,
}: StatsCardProps) {
  return (
    <Card className={cn('text-center', className)}>
      {icon && (
        <div className="text-3xl mb-2 text-primary">
          {typeof icon === 'string' ? icon : icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-muted-foreground mb-1">
        {title}
      </h3>
      <div className="text-2xl font-bold text-foreground mb-2">
        {value}
      </div>
      {trend && (
        <div className="text-sm font-medium text-green-600">
          {trend}
        </div>
      )}
      {change !== undefined && (
        <div className={cn(
          'text-sm font-medium',
          change >= 0 ? 'text-green-600' : 'text-red-600'
        )}>
          {change >= 0 ? '+' : ''}{(change || 0).toFixed(2)}%
        </div>
      )}
      {description && (
        <div className="text-xs text-muted-foreground mt-1">
          {description}
        </div>
      )}
    </Card>
  )
}