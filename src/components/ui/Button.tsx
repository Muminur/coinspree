import { ButtonHTMLAttributes, ReactNode, cloneElement, isValidElement } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  asChild?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  asChild = false,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    destructive: 'btn-destructive',
    outline: 'btn-outline',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }

  const buttonClassName = cn(
    variants[variant],
    sizes[size],
    loading && 'opacity-50 cursor-not-allowed',
    className
  )

  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      ...children.props,
      className: cn(buttonClassName, children.props.className),
      disabled: disabled || loading,
    })
  }

  return (
    <button
      className={buttonClassName}
      disabled={disabled || loading}
      {...props}
      // Prevent double-click submissions
      onClick={(e) => {
        if (loading || disabled) {
          e.preventDefault()
          return false
        }
        props.onClick?.(e)
      }}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  )
}
