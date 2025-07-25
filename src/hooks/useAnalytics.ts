'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

interface AnalyticsEvent {
  eventType: 'page_view' | 'session_start' | 'session_end' | 'user_action' | 'conversion' | 'feature_usage'
  sessionId: string
  page?: string
  action?: string
  feature?: string
  duration?: number
  metadata?: Record<string, any>
}

class AnalyticsManager {
  private sessionId: string
  private sessionStartTime: number
  private lastPageView: number
  private isEnabled: boolean = true

  constructor() {
    // Generate or retrieve session ID
    this.sessionId = this.getOrCreateSessionId()
    this.sessionStartTime = Date.now()
    this.lastPageView = Date.now()

    // Track session start
    this.trackEvent({
      eventType: 'session_start',
      sessionId: this.sessionId,
      metadata: {
        userAgent: navigator.userAgent,
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    })

    // Track session end on page unload
    this.setupSessionEndTracking()
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id')
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('analytics_session_id', sessionId)
    }

    return sessionId
  }

  private setupSessionEndTracking() {
    const trackSessionEnd = () => {
      const sessionDuration = Math.round((Date.now() - this.sessionStartTime) / 1000)
      
      this.trackEvent({
        eventType: 'session_end',
        sessionId: this.sessionId,
        duration: sessionDuration,
        metadata: {
          totalDuration: sessionDuration,
          endReason: 'page_unload'
        }
      }, false) // Don't wait for response on unload
    }

    window.addEventListener('beforeunload', trackSessionEnd)
    window.addEventListener('pagehide', trackSessionEnd)

    // Also track session end on visibility change (when tab is hidden for a long time)
    let hiddenTime = 0
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        hiddenTime = Date.now()
      } else if (hiddenTime && Date.now() - hiddenTime > 5 * 60 * 1000) { // 5 minutes
        trackSessionEnd()
        // Start new session
        this.sessionId = this.getOrCreateSessionId()
        this.sessionStartTime = Date.now()
        this.trackEvent({
          eventType: 'session_start',
          sessionId: this.sessionId,
          metadata: { resumedFromBackground: true }
        })
      }
    })
  }

  async trackEvent(event: AnalyticsEvent, waitForResponse: boolean = true): Promise<boolean> {
    if (!this.isEnabled) return false

    try {
      console.log('📊 Analytics: Tracking event:', event.eventType, event)

      const fetchPromise = fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
        credentials: 'include'
      })

      if (waitForResponse) {
        const response = await fetchPromise
        return response.ok
      } else {
        // Fire and forget for events during page unload
        fetchPromise.catch(error => {
          console.warn('Analytics tracking failed:', error)
        })
        return true
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error)
      return false
    }
  }

  trackPageView(page: string, metadata?: Record<string, any>) {
    const timeOnPreviousPage = Date.now() - this.lastPageView
    
    this.trackEvent({
      eventType: 'page_view',
      sessionId: this.sessionId,
      page,
      metadata: {
        ...metadata,
        timeOnPreviousPage: Math.round(timeOnPreviousPage / 1000),
        referrer: document.referrer
      }
    })

    this.lastPageView = Date.now()
  }

  trackUserAction(action: string, metadata?: Record<string, any>) {
    this.trackEvent({
      eventType: 'user_action',
      sessionId: this.sessionId,
      action,
      metadata
    })
  }

  trackConversion(action: string, metadata?: Record<string, any>) {
    this.trackEvent({
      eventType: 'conversion',
      sessionId: this.sessionId,
      action,
      metadata
    })
  }

  trackFeatureUsage(feature: string, metadata?: Record<string, any>) {
    this.trackEvent({
      eventType: 'feature_usage',
      sessionId: this.sessionId,
      feature,
      metadata
    })
  }

  disable() {
    this.isEnabled = false
  }

  enable() {
    this.isEnabled = true
  }
}

// Global analytics instance
let analyticsInstance: AnalyticsManager | null = null

function getAnalyticsInstance(): AnalyticsManager {
  if (!analyticsInstance && typeof window !== 'undefined') {
    analyticsInstance = new AnalyticsManager()
  }
  return analyticsInstance!
}

export function useAnalytics() {
  const pathname = usePathname()
  const lastPathnameRef = useRef<string>('')

  useEffect(() => {
    // Track page views automatically
    if (pathname && pathname !== lastPathnameRef.current) {
      const analytics = getAnalyticsInstance()
      if (analytics) {
        analytics.trackPageView(pathname, {
          fromPath: lastPathnameRef.current || 'direct'
        })
      }
      lastPathnameRef.current = pathname
    }
  }, [pathname])

  return {
    trackPageView: (page: string, metadata?: Record<string, any>) => {
      const analytics = getAnalyticsInstance()
      analytics?.trackPageView(page, metadata)
    },

    trackUserAction: (action: string, metadata?: Record<string, any>) => {
      const analytics = getAnalyticsInstance()
      analytics?.trackUserAction(action, metadata)
    },

    trackConversion: (action: string, metadata?: Record<string, any>) => {
      const analytics = getAnalyticsInstance()
      analytics?.trackConversion(action, metadata)
    },

    trackFeatureUsage: (feature: string, metadata?: Record<string, any>) => {
      const analytics = getAnalyticsInstance()
      analytics?.trackFeatureUsage(feature, metadata)
    },

    trackEvent: (event: Omit<AnalyticsEvent, 'sessionId'>) => {
      const analytics = getAnalyticsInstance()
      analytics?.trackEvent({
        ...event,
        sessionId: analytics.sessionId
      })
    }
  }
}

// Utility functions for direct tracking (without hooks)
export const Analytics = {
  trackUserAction: (action: string, metadata?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      const analytics = getAnalyticsInstance()
      analytics?.trackUserAction(action, metadata)
    }
  },

  trackConversion: (action: string, metadata?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      const analytics = getAnalyticsInstance()
      analytics?.trackConversion(action, metadata)
    }
  },

  trackFeatureUsage: (feature: string, metadata?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      const analytics = getAnalyticsInstance()
      analytics?.trackFeatureUsage(feature, metadata)
    }
  },

  trackError: (error: string, metadata?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      const analytics = getAnalyticsInstance()
      analytics?.trackUserAction('error', {
        error,
        ...metadata,
        stack: new Error().stack
      })
    }
  }
}