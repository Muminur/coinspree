'use client'

import { usePathname } from 'next/navigation'
import { FeedbackWidget } from './FeedbackWidget'

interface FeedbackWidgetProviderProps {
  children: React.ReactNode
}

export function FeedbackWidgetProvider({ children }: FeedbackWidgetProviderProps) {
  const pathname = usePathname()

  // Don't show feedback widget on these pages
  const excludePaths = [
    '/login',
    '/register',
    '/reset-password',
    '/unsubscribe',
    '/admin' // Admin pages have their own feedback systems
  ]

  // Check if current path should exclude the feedback widget
  const shouldShowWidget = !excludePaths.some(path => 
    pathname.startsWith(path) || pathname === '/' // Also exclude landing page for now
  )

  return (
    <>
      {children}
      {shouldShowWidget && (
        <FeedbackWidget page={pathname} />
      )}
    </>
  )
}