import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-current border-t-transparent',
        sizes[size],
        className
      )}
    />
  )
}

interface LoadingStateProps {
  loading?: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

export function LoadingState({
  loading = false,
  children,
  fallback,
  className,
}: LoadingStateProps) {
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        {fallback || <LoadingSpinner />}
      </div>
    )
  }

  return <>{children}</>
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner size="xl" className="mx-auto text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}