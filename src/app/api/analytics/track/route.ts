import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { KV } from '@/lib/kv'

interface AnalyticsEvent {
  eventType: 'page_view' | 'session_start' | 'session_end' | 'user_action' | 'conversion' | 'feature_usage'
  userId?: string
  sessionId: string
  page?: string
  action?: string
  feature?: string
  duration?: number
  timestamp: string
  userAgent?: string
  referrer?: string
  metadata?: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    console.log('📊 Analytics: Tracking user analytics event')
    
    const body = await request.json()
    const { 
      eventType, 
      sessionId, 
      page, 
      action, 
      feature, 
      duration, 
      metadata = {} 
    } = body

    // Validate required fields
    if (!eventType || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: eventType, sessionId' },
        { status: 400 }
      )
    }

    // Try to get user from session (optional)
    let userId: string | undefined
    try {
      const session = await Auth.getSession()
      userId = session?.userId
    } catch {
      // Anonymous tracking is allowed
    }

    // Get additional request metadata
    const userAgent = request.headers.get('user-agent')
    const referrer = request.headers.get('referer')
    const timestamp = new Date().toISOString()

    const analyticsEvent: AnalyticsEvent = {
      eventType,
      userId,
      sessionId,
      page,
      action,
      feature,
      duration,
      timestamp,
      userAgent,
      referrer,
      metadata
    }

    // Store the analytics event
    const eventKey = `analytics:event:${Date.now()}:${sessionId}`
    await KV.hsetall(eventKey, {
      event_type: eventType,
      user_id: userId || 'anonymous',
      session_id: sessionId,
      page: page || '',
      action: action || '',
      feature: feature || '',
      duration: duration?.toString() || '0',
      timestamp,
      user_agent: userAgent || '',
      referrer: referrer || '',
      metadata: JSON.stringify(metadata)
    })

    // Set TTL for event data (keep for 30 days)
    await KV.expire(eventKey, 30 * 24 * 60 * 60)

    // Update daily analytics counters
    const dateKey = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const dailyStatsKey = `analytics:daily:${dateKey}`

    // Increment counters based on event type
    switch (eventType) {
      case 'page_view':
        await KV.hincrby(dailyStatsKey, 'page_views', 1)
        if (page) {
          await KV.hincrby(dailyStatsKey, `page_views:${page}`, 1)
        }
        break
      
      case 'session_start':
        await KV.hincrby(dailyStatsKey, 'sessions', 1)
        await KV.sadd(`analytics:active_sessions:${dateKey}`, sessionId)
        if (userId) {
          await KV.sadd(`analytics:active_users:${dateKey}`, userId)
        }
        break
      
      case 'session_end':
        if (duration) {
          // Store session duration for average calculation
          await KV.lpush(`analytics:session_durations:${dateKey}`, duration.toString())
          await KV.expire(`analytics:session_durations:${dateKey}`, 7 * 24 * 60 * 60) // Keep for 7 days
        }
        break
      
      case 'user_action':
        await KV.hincrby(dailyStatsKey, 'user_actions', 1)
        if (action) {
          await KV.hincrby(dailyStatsKey, `actions:${action}`, 1)
        }
        break
      
      case 'conversion':
        await KV.hincrby(dailyStatsKey, 'conversions', 1)
        if (action) {
          await KV.hincrby(dailyStatsKey, `conversions:${action}`, 1)
        }
        break
      
      case 'feature_usage':
        await KV.hincrby(dailyStatsKey, 'feature_usage', 1)
        if (feature) {
          await KV.hincrby(dailyStatsKey, `features:${feature}`, 1)
        }
        break
    }

    // Set TTL for daily stats (keep for 90 days)
    await KV.expire(dailyStatsKey, 90 * 24 * 60 * 60)

    // Update real-time user activity metrics
    await updateUserActivityMetrics(userId, sessionId, eventType, timestamp)

    console.log(`✅ Analytics: Tracked ${eventType} event for session ${sessionId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Analytics event tracked successfully'
    })

  } catch (error) {
    console.error('❌ Analytics: Failed to track analytics event:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to track analytics event'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Analytics: Getting user engagement analytics')
    
    // Verify admin authentication for analytics access
    const session = await Auth.requireAuth()
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const analytics = {
      summary: await getUserEngagementSummary(days),
      dailyStats: await getDailyAnalytics(days),
      topPages: await getTopPages(days),
      topActions: await getTopActions(days),
      featureUsage: await getFeatureUsage(days),
      userJourney: await getUserJourney(days)
    }

    console.log('✅ Analytics: User engagement analytics retrieved successfully')
    
    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('❌ Analytics: Failed to get user engagement analytics:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get analytics'
    }, { status: 500 })
  }
}

async function updateUserActivityMetrics(userId: string | undefined, sessionId: string, eventType: string, timestamp: string) {
  try {
    const activityKey = 'user:activity'
    const now = new Date()
    const hour = now.getHours()
    
    // Update hourly activity patterns
    await KV.hincrby(activityKey, `hourly:${hour}`, 1)
    
    // Update active users tracking
    if (userId) {
      await KV.sadd('analytics:active_users:24h', userId)
      await KV.expire('analytics:active_users:24h', 24 * 60 * 60)
      
      await KV.sadd('analytics:active_users:7d', userId)
      await KV.expire('analytics:active_users:7d', 7 * 24 * 60 * 60)
      
      // Track user activity timestamp
      await KV.hset('user:last_activity', userId, timestamp)
    }
    
    // Update active sessions
    await KV.sadd('analytics:active_sessions:current', sessionId)
    await KV.expire('analytics:active_sessions:current', 30 * 60) // 30 minutes
    
  } catch (error) {
    console.error('❌ Analytics: Failed to update user activity metrics:', error)
  }
}

async function getUserEngagementSummary(days: number) {
  const dateKeys = []
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    dateKeys.push(`analytics:daily:${date.toISOString().split('T')[0]}`)
  }

  let totalPageViews = 0
  let totalSessions = 0
  let totalActions = 0
  let totalConversions = 0

  for (const key of dateKeys) {
    const dayData = await KV.hgetall(key) || {}
    totalPageViews += parseInt(dayData.page_views || '0')
    totalSessions += parseInt(dayData.sessions || '0')
    totalActions += parseInt(dayData.user_actions || '0')
    totalConversions += parseInt(dayData.conversions || '0')
  }

  const activeUsers24h = await KV.scard('analytics:active_users:24h') || 0
  const activeUsers7d = await KV.scard('analytics:active_users:7d') || 0
  const activeSessions = await KV.scard('analytics:active_sessions:current') || 0

  return {
    totalPageViews,
    totalSessions,
    totalActions,
    totalConversions,
    activeUsers24h,
    activeUsers7d,
    activeSessions,
    averageSessionsPerDay: Math.round(totalSessions / days),
    conversionRate: totalSessions > 0 ? ((totalConversions / totalSessions) * 100).toFixed(2) : '0.00'
  }
}

async function getDailyAnalytics(days: number) {
  const results = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]
    const dailyKey = `analytics:daily:${dateKey}`
    
    const dayData = await KV.hgetall(dailyKey) || {}
    
    results.push({
      date: dateKey,
      pageViews: parseInt(dayData.page_views || '0'),
      sessions: parseInt(dayData.sessions || '0'),
      userActions: parseInt(dayData.user_actions || '0'),
      conversions: parseInt(dayData.conversions || '0'),
      featureUsage: parseInt(dayData.feature_usage || '0')
    })
  }
  
  return results
}

async function getTopPages(days: number) {
  const pageViews: Record<string, number> = {}
  
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dailyKey = `analytics:daily:${date.toISOString().split('T')[0]}`
    const dayData = await KV.hgetall(dailyKey) || {}
    
    for (const [key, value] of Object.entries(dayData)) {
      if (key.startsWith('page_views:')) {
        const page = key.replace('page_views:', '')
        pageViews[page] = (pageViews[page] || 0) + parseInt(value.toString())
      }
    }
  }
  
  return Object.entries(pageViews)
    .map(([page, views]) => ({ page, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
}

async function getTopActions(days: number) {
  const actions: Record<string, number> = {}
  
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dailyKey = `analytics:daily:${date.toISOString().split('T')[0]}`
    const dayData = await KV.hgetall(dailyKey) || {}
    
    for (const [key, value] of Object.entries(dayData)) {
      if (key.startsWith('actions:')) {
        const action = key.replace('actions:', '')
        actions[action] = (actions[action] || 0) + parseInt(value.toString())
      }
    }
  }
  
  return Object.entries(actions)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

async function getFeatureUsage(days: number) {
  const features: Record<string, number> = {}
  
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dailyKey = `analytics:daily:${date.toISOString().split('T')[0]}`
    const dayData = await KV.hgetall(dailyKey) || {}
    
    for (const [key, value] of Object.entries(dayData)) {
      if (key.startsWith('features:')) {
        const feature = key.replace('features:', '')
        features[feature] = (features[feature] || 0) + parseInt(value.toString())
      }
    }
  }
  
  return Object.entries(features)
    .map(([feature, usage]) => ({ feature, usage }))
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 10)
}

async function getUserJourney(days: number) {
  // This would be more complex in a real implementation
  // For now, return a simplified user journey based on top pages and actions
  const topPages = await getTopPages(days)
  const topActions = await getTopActions(days)
  
  return {
    entryPoints: topPages.slice(0, 5),
    commonActions: topActions.slice(0, 5),
    dropOffPoints: [] // Would need more sophisticated tracking
  }
}