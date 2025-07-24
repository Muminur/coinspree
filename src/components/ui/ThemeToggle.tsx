'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/Button'

interface ThemeToggleProps {
  variant?: 'dropdown' | 'simple'
  showLabels?: boolean
}

export function ThemeToggle({ variant = 'simple', showLabels = true }: ThemeToggleProps) {
  const { theme, setTheme, actualTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
    )
  }

  if (variant === 'dropdown') {
    return (
      <div className="space-y-3">
        {showLabels && (
          <h3 className="text-sm font-medium text-foreground">Theme</h3>
        )}
        <div className="grid grid-cols-1 gap-2">
          {[
            { value: 'light' as const, label: '☀️ Light', desc: 'Always light theme' },
            { value: 'dark' as const, label: '🌙 Dark', desc: 'Always dark theme' },
            { value: 'system' as const, label: '🖥️ System', desc: 'Follow system preference' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`
                flex items-center justify-between p-3 rounded-lg border transition-all hover:scale-[1.02] active:scale-[0.98]
                ${theme === option.value 
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20' 
                  : 'border-border bg-card hover:bg-muted text-card-foreground hover:border-primary/30'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{option.label.split(' ')[0]}</span>
                <div>
                  <p className="font-medium text-left">{option.label.split(' ').slice(1).join(' ') || ''}</p>
                  <p className="text-xs text-muted-foreground">{option.desc}</p>
                </div>
              </div>
              {theme === option.value && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
        {theme === 'system' && (
          <p className="text-xs text-muted-foreground">
            Currently using: {actualTheme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </p>
        )}
      </div>
    )
  }

  // Simple toggle button
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
        setTheme(nextTheme)
      }}
      className="w-auto px-3"
    >
      {theme === 'light' && '☀️'}
      {theme === 'dark' && '🌙'}
      {theme === 'system' && '🖥️'}
      {showLabels && (
        <span className="ml-2">
          {theme === 'light' && 'Light'}
          {theme === 'dark' && 'Dark'}  
          {theme === 'system' && 'System'}
        </span>
      )}
    </Button>
  )
}

// Compact version for navbar
export function ThemeToggleCompact() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded bg-muted animate-pulse" />
    )
  }

  const handleToggle = () => {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(nextTheme)
  }

  return (
    <button
      onClick={handleToggle}
      className="
        p-2 rounded-lg transition-colors
        hover:bg-white/10 focus:bg-white/10
        text-white/80 hover:text-white
        focus:outline-none focus:ring-2 focus:ring-white/20
      "
      title={`Current theme: ${theme} (click to cycle)`}
    >
      {theme === 'light' && '☀️'}
      {theme === 'dark' && '🌙'}
      {theme === 'system' && '🖥️'}
    </button>
  )
}