'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DropdownProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, children, align = 'right', className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="focus:outline-none"
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-1 z-50 min-w-48 bg-card border border-border rounded-md shadow-lg py-1',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps {
  children: ReactNode
  onClick?: () => void
  href?: string
  className?: string
}

export function DropdownItem({ children, onClick, href, className }: DropdownItemProps) {
  const handleClick = () => {
    onClick?.()
  }

  if (href) {
    return (
      <a
        href={href}
        onClick={handleClick}
        className={cn(
          'block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors',
          className
        )}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors',
        className
      )}
    >
      {children}
    </button>
  )
}

export function DropdownSeparator() {
  return <div className="my-1 border-t border-border" />
}