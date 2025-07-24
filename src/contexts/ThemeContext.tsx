'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  actualTheme: 'light' | 'dark' // The resolved theme (light or dark, never system)
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('system')
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load theme from localStorage (only on client)
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('coinspree-theme') as Theme
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setTheme(savedTheme)
      }
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return

    const root = document.documentElement
    
    // Save theme to localStorage
    localStorage.setItem('coinspree-theme', theme)

    // Determine actual theme
    let resolvedTheme: 'light' | 'dark'
    
    if (theme === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light'
    } else {
      resolvedTheme = theme
    }

    setActualTheme(resolvedTheme)

    // Apply theme to document
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme, mounted])

  useEffect(() => {
    if (!mounted || theme !== 'system' || typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      const resolvedTheme = mediaQuery.matches ? 'dark' : 'light'
      setActualTheme(resolvedTheme)
      
      const root = document.documentElement
      if (resolvedTheme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, mounted])

  // Always provide the context, but don't access localStorage until mounted
  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}