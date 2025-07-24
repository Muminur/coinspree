'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  onClose?: () => void
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, 300) // Animation duration
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  const typeStyles = {
    success: 'bg-green-500 border-green-600 text-white',
    error: 'bg-red-500 border-red-600 text-white',
    warning: 'bg-yellow-500 border-yellow-600 text-black',
    info: 'bg-blue-500 border-blue-600 text-white',
  }

  const icons = {
    success: '✅',
    error: '❌', 
    warning: '⚠️',
    info: 'ℹ️',
  }

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border shadow-lg',
        'flex items-center gap-2 min-w-64 max-w-md',
        'transform transition-all duration-300 ease-in-out',
        typeStyles[type],
        isLeaving ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      )}
    >
      <span className="text-lg">{icons[type]}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={() => {
          setIsLeaving(true)
          setTimeout(() => {
            setIsVisible(false)
            onClose?.()
          }, 300)
        }}
        className="ml-2 text-lg hover:opacity-70 transition-opacity"
      >
        ×
      </button>
    </div>
  )
}