import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <input
          className={cn(
            'w-full px-3 py-2 border rounded-md',
            'bg-background text-foreground',
            'border-input focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'placeholder:text-muted-foreground',
            error && 'border-destructive focus:border-destructive',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <span className="text-destructive">⚠</span>
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
