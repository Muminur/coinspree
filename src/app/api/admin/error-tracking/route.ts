import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { KV } from '@/lib/kv'

interface ErrorLog {
  id: string
  timestamp: string
  level: 'critical' | 'error' | 'warning' | 'info'
  category: 'auth' | 'payment' | 'email' | 'api' | 'database' | 'crypto' | 'system' | 'user'
  message: string
  stack?: string
  userId?: string
  userEmail?: string
  endpoint?: string
  method?: string
  statusCode?: number
  userAgent?: string
  ip?: string
  metadata?: Record<string, any>
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: string
  resolveNotes?: string
  occurrenceCount: number
  firstOccurrence: string
  lastOccurrence: string
}

interface ErrorAnalytics {
  timestamp: string
  summary: {
    totalErrors: number
    criticalErrors: number
    unresolvedErrors: number
    errorRate24h: number
    topErrorCategories: Array<{ category: string; count: number; percentage: number }>
  }
  recentErrors: ErrorLog[]
  errorTrends: {
    hourlyErrors: Array<{ hour: number; count: number; criticalCount: number }>
    dailyErrors: Array<{ date: string; count: number; criticalCount: number; resolved: number }>
    categoryBreakdown: Record<string, number>
    levelBreakdown: Record<string, number>
  }
  topErrors: Array<{
    message: string
    category: string
    level: string
    count: number
    lastOccurrence: string
    resolved: boolean
  }>
  systemHealth: {
    errorFrequency: number // errors per hour
    criticalErrorFrequency: number
    averageResolutionTime: number // hours
    healthScore: number // 0-100
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🐛 Error Tracking: Getting error analytics')
    
    // Verify admin authentication
    const session = await Auth.requireAuth()
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const timeframe = searchParams.get('timeframe') || '24h'
    const category = searchParams.get('category') || 'all'
    const level = searchParams.get('level') || 'all'
    const resolved = searchParams.get('resolved') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Generate comprehensive error analytics
    const analytics = await generateErrorAnalytics(timeframe, category, level, resolved, limit)

    console.log('✅ Error Tracking: Analytics retrieved successfully')
    console.log(`🐛 Error Tracking: Total errors: ${analytics.summary.totalErrors}, Critical: ${analytics.summary.criticalErrors}`)
    
    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('❌ Error Tracking: Failed to get error analytics:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get error analytics'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🐛 Error Tracking: Logging new error')
    
    const body = await request.json()
    const {
      level,
      category,
      message,
      stack,
      userId,
      userEmail,
      endpoint,
      method,
      statusCode,
      userAgent,
      ip,
      metadata
    } = body

    // Validate required fields
    if (!level || !category || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: level, category, message' },
        { status: 400 }
      )
    }

    // Check if this is a duplicate error (same message + category in last hour)
    const existingError = await findExistingError(message, category)
    
    if (existingError) {
      // Update existing error occurrence count and last occurrence
      await updateErrorOccurrence(existingError.id)
      console.log(`🔄 Error Tracking: Updated existing error ${existingError.id}`)
      
      return NextResponse.json({
        success: true,
        errorId: existingError.id,
        message: 'Error occurrence updated'
      })
    }

    // Create new error log
    const errorLog = await createErrorLog({
      level,
      category,
      message,
      stack,
      userId,
      userEmail,
      endpoint,
      method,
      statusCode,
      userAgent,
      ip,
      metadata: metadata || {}
    })

    // Check if this is a critical error that needs immediate attention
    if (level === 'critical') {
      await sendCriticalErrorAlert(errorLog)
    }

    console.log(`✅ Error Tracking: Logged new ${level} error: ${errorLog.id}`)
    
    return NextResponse.json({
      success: true,
      errorId: errorLog.id,
      message: 'Error logged successfully'
    })

  } catch (error) {
    console.error('❌ Error Tracking: Failed to log error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to log error'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    console.log('🐛 Error Tracking: Updating error status')
    
    // Verify admin authentication
    const session = await Auth.requireAuth()
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { errorId, resolved, resolveNotes } = body

    if (!errorId) {
      return NextResponse.json(
        { success: false, error: 'Missing errorId' },
        { status: 400 }
      )
    }

    // Update error resolution status
    await updateErrorResolution(errorId, resolved, session.user.email, resolveNotes)

    console.log(`✅ Error Tracking: Updated error ${errorId} resolution status`)
    
    return NextResponse.json({
      success: true,
      message: 'Error status updated successfully'
    })

  } catch (error) {
    console.error('❌ Error Tracking: Failed to update error status:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update error status'
    }, { status: 500 })
  }
}

async function generateErrorAnalytics(
  timeframe: string, 
  category: string, 
  level: string, 
  resolved: string, 
  limit: number
): Promise<ErrorAnalytics> {
  const now = Date.now()
  let fromTime: number
  
  switch (timeframe) {
    case '1h':
      fromTime = now - (60 * 60 * 1000)
      break
    case '24h':
      fromTime = now - (24 * 60 * 60 * 1000)
      break
    case '7d':
      fromTime = now - (7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      fromTime = now - (30 * 24 * 60 * 60 * 1000)
      break
    default:
      fromTime = now - (24 * 60 * 60 * 1000)
  }

  // Get error logs in timeframe
  const errorLogs = await getErrorLogsInTimeframe(fromTime, category, level, resolved)
  
  // Calculate summary metrics
  const summary = calculateErrorSummary(errorLogs, fromTime)
  
  // Get recent errors for display
  const recentErrors = errorLogs.slice(0, limit)
  
  // Generate trends
  const errorTrends = generateErrorTrends(errorLogs, fromTime)
  
  // Find top errors
  const topErrors = findTopErrors(errorLogs)
  
  // Calculate system health
  const systemHealth = calculateSystemHealth(errorLogs, fromTime)

  return {
    timestamp: new Date().toISOString(),
    summary,
    recentErrors,
    errorTrends,
    topErrors,
    systemHealth
  }
}

async function getErrorLogsInTimeframe(
  fromTime: number, 
  category: string, 
  level: string, 
  resolved: string
): Promise<ErrorLog[]> {
  try {
    const errorKeys = await KV.keys('error:log:*')
    const errorLogs: ErrorLog[] = []
    
    for (const key of errorKeys) {
      const error = await KV.hgetall(key)
      if (error && error.timestamp) {
        const errorTime = parseInt(error.timestamp)
        if (errorTime >= fromTime) {
          const errorLog: ErrorLog = {
            id: error.id || key.split(':')[2],
            timestamp: new Date(errorTime).toISOString(),
            level: error.level as any,
            category: error.category as any,
            message: error.message,
            stack: error.stack,
            userId: error.user_id,
            userEmail: error.user_email,
            endpoint: error.endpoint,
            method: error.method,
            statusCode: error.status_code ? parseInt(error.status_code) : undefined,
            userAgent: error.user_agent,
            ip: error.ip,
            metadata: error.metadata ? JSON.parse(error.metadata) : {},
            resolved: error.resolved === '1',
            resolvedBy: error.resolved_by,
            resolvedAt: error.resolved_at,
            resolveNotes: error.resolve_notes,
            occurrenceCount: parseInt(error.occurrence_count || '1'),
            firstOccurrence: error.first_occurrence || new Date(errorTime).toISOString(),
            lastOccurrence: error.last_occurrence || new Date(errorTime).toISOString()
          }
          
          // Apply filters
          if (category !== 'all' && errorLog.category !== category) continue
          if (level !== 'all' && errorLog.level !== level) continue
          if (resolved === 'true' && !errorLog.resolved) continue
          if (resolved === 'false' && errorLog.resolved) continue
          
          errorLogs.push(errorLog)
        }
      }
    }
    
    // Sort by timestamp (newest first)
    return errorLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
  } catch (error) {
    console.error('Failed to get error logs:', error)
    return []
  }
}

function calculateErrorSummary(errorLogs: ErrorLog[], fromTime: number) {
  const totalErrors = errorLogs.length
  const criticalErrors = errorLogs.filter(e => e.level === 'critical').length
  const unresolvedErrors = errorLogs.filter(e => !e.resolved).length
  
  // Calculate 24h error rate
  const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000)
  const errors24h = errorLogs.filter(e => new Date(e.timestamp).getTime() >= twentyFourHoursAgo).length
  const errorRate24h = errors24h / 24 // errors per hour
  
  // Calculate top categories
  const categoryCount: Record<string, number> = {}
  errorLogs.forEach(e => {
    categoryCount[e.category] = (categoryCount[e.category] || 0) + 1
  })
  
  const topErrorCategories = Object.entries(categoryCount)
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalErrors > 0 ? Math.round((count / totalErrors) * 100 * 100) / 100 : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    totalErrors,
    criticalErrors,
    unresolvedErrors,
    errorRate24h: Math.round(errorRate24h * 100) / 100,
    topErrorCategories
  }
}

function generateErrorTrends(errorLogs: ErrorLog[], fromTime: number) {
  // Generate hourly trends for last 24 hours
  const hourlyErrors = new Array(24).fill(0).map((_, index) => ({
    hour: index,
    count: 0,
    criticalCount: 0
  }))
  
  const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000)
  const recentErrors = errorLogs.filter(e => new Date(e.timestamp).getTime() >= twentyFourHoursAgo)
  
  recentErrors.forEach(error => {
    const hour = new Date(error.timestamp).getHours()
    hourlyErrors[hour].count++
    if (error.level === 'critical') {
      hourlyErrors[hour].criticalCount++
    }
  })
  
  // Generate daily trends for last 7 days
  const dailyErrors = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const dayStart = date.getTime()
    const dayEnd = dayStart + (24 * 60 * 60 * 1000)
    
    const dayErrors = errorLogs.filter(e => {
      const errorTime = new Date(e.timestamp).getTime()
      return errorTime >= dayStart && errorTime < dayEnd
    })
    
    dailyErrors.push({
      date: date.toISOString().split('T')[0],
      count: dayErrors.length,
      criticalCount: dayErrors.filter(e => e.level === 'critical').length,
      resolved: dayErrors.filter(e => e.resolved).length
    })
  }
  
  // Category breakdown
  const categoryBreakdown: Record<string, number> = {}
  errorLogs.forEach(e => {
    categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + 1
  })
  
  // Level breakdown
  const levelBreakdown: Record<string, number> = {}
  errorLogs.forEach(e => {
    levelBreakdown[e.level] = (levelBreakdown[e.level] || 0) + 1
  })

  return {
    hourlyErrors,
    dailyErrors,
    categoryBreakdown,
    levelBreakdown
  }
}

function findTopErrors(errorLogs: ErrorLog[]) {
  // Group errors by message and category
  const errorGroups: Record<string, {
    message: string
    category: string
    level: string
    count: number
    lastOccurrence: string
    resolved: boolean
  }> = {}
  
  errorLogs.forEach(error => {
    const key = `${error.message}:${error.category}`
    if (!errorGroups[key]) {
      errorGroups[key] = {
        message: error.message,
        category: error.category,
        level: error.level,
        count: 0,
        lastOccurrence: error.timestamp,
        resolved: error.resolved
      }
    }
    errorGroups[key].count += error.occurrenceCount
    if (new Date(error.timestamp) > new Date(errorGroups[key].lastOccurrence)) {
      errorGroups[key].lastOccurrence = error.timestamp
      errorGroups[key].resolved = error.resolved
    }
  })
  
  return Object.values(errorGroups)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function calculateSystemHealth(errorLogs: ErrorLog[], fromTime: number) {
  const timeSpanHours = (Date.now() - fromTime) / (1000 * 60 * 60)
  const errorFrequency = errorLogs.length / timeSpanHours
  const criticalErrorFrequency = errorLogs.filter(e => e.level === 'critical').length / timeSpanHours
  
  // Calculate average resolution time
  const resolvedErrors = errorLogs.filter(e => e.resolved && e.resolvedAt)
  const resolutionTimes = resolvedErrors.map(e => {
    const errorTime = new Date(e.timestamp).getTime()
    const resolvedTime = new Date(e.resolvedAt!).getTime()
    return (resolvedTime - errorTime) / (1000 * 60 * 60) // hours
  })
  
  const averageResolutionTime = resolutionTimes.length > 0 
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length 
    : 0
  
  // Calculate health score (0-100)
  let healthScore = 100
  healthScore -= Math.min(errorFrequency * 2, 50) // -2 points per error per hour, max -50
  healthScore -= Math.min(criticalErrorFrequency * 10, 30) // -10 points per critical error per hour, max -30
  healthScore -= Math.min(averageResolutionTime, 20) // -1 point per hour resolution time, max -20
  healthScore = Math.max(0, Math.round(healthScore))

  return {
    errorFrequency: Math.round(errorFrequency * 100) / 100,
    criticalErrorFrequency: Math.round(criticalErrorFrequency * 100) / 100,
    averageResolutionTime: Math.round(averageResolutionTime * 100) / 100,
    healthScore
  }
}

async function findExistingError(message: string, category: string): Promise<ErrorLog | null> {
  try {
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    const errorKeys = await KV.keys('error:log:*')
    
    for (const key of errorKeys) {
      const error = await KV.hgetall(key)
      if (error && 
          error.message === message && 
          error.category === category &&
          parseInt(error.timestamp) >= oneHourAgo) {
        return {
          id: error.id || key.split(':')[2],
          timestamp: new Date(parseInt(error.timestamp)).toISOString(),
          level: error.level as any,
          category: error.category as any,
          message: error.message,
          stack: error.stack,
          userId: error.user_id,
          userEmail: error.user_email,
          endpoint: error.endpoint,
          method: error.method,
          statusCode: error.status_code ? parseInt(error.status_code) : undefined,
          userAgent: error.user_agent,
          ip: error.ip,
          metadata: error.metadata ? JSON.parse(error.metadata) : {},
          resolved: error.resolved === '1',
          resolvedBy: error.resolved_by,
          resolvedAt: error.resolved_at,
          resolveNotes: error.resolve_notes,
          occurrenceCount: parseInt(error.occurrence_count || '1'),
          firstOccurrence: error.first_occurrence || new Date(parseInt(error.timestamp)).toISOString(),
          lastOccurrence: error.last_occurrence || new Date(parseInt(error.timestamp)).toISOString()
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Failed to find existing error:', error)
    return null
  }
}

async function updateErrorOccurrence(errorId: string) {
  try {
    const errorKey = `error:log:${errorId}`
    const currentCount = parseInt(await KV.hget(errorKey, 'occurrence_count') || '1')
    
    await KV.hsetall(errorKey, {
      occurrence_count: (currentCount + 1).toString(),
      last_occurrence: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to update error occurrence:', error)
  }
}

async function createErrorLog(errorData: {
  level: string
  category: string
  message: string
  stack?: string
  userId?: string
  userEmail?: string
  endpoint?: string
  method?: string
  statusCode?: number
  userAgent?: string
  ip?: string
  metadata: Record<string, any>
}): Promise<ErrorLog> {
  try {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const timestamp = Date.now()
    const errorKey = `error:log:${errorId}`
    
    const errorLog: ErrorLog = {
      id: errorId,
      timestamp: new Date(timestamp).toISOString(),
      level: errorData.level as any,
      category: errorData.category as any,
      message: errorData.message,
      stack: errorData.stack,
      userId: errorData.userId,
      userEmail: errorData.userEmail,
      endpoint: errorData.endpoint,
      method: errorData.method,
      statusCode: errorData.statusCode,
      userAgent: errorData.userAgent,
      ip: errorData.ip,
      metadata: errorData.metadata,
      resolved: false,
      occurrenceCount: 1,
      firstOccurrence: new Date(timestamp).toISOString(),
      lastOccurrence: new Date(timestamp).toISOString()
    }
    
    // Store in KV with null value filtering
    const errorRecord: Record<string, string> = {
      id: errorId,
      timestamp: timestamp.toString(),
      level: errorData.level,
      category: errorData.category,
      message: errorData.message,
      resolved: '0',
      occurrence_count: '1',
      first_occurrence: new Date(timestamp).toISOString(),
      last_occurrence: new Date(timestamp).toISOString(),
      created_at: new Date().toISOString()
    }
    
    if (errorData.stack) errorRecord.stack = errorData.stack
    if (errorData.userId) errorRecord.user_id = errorData.userId
    if (errorData.userEmail) errorRecord.user_email = errorData.userEmail
    if (errorData.endpoint) errorRecord.endpoint = errorData.endpoint
    if (errorData.method) errorRecord.method = errorData.method
    if (errorData.statusCode) errorRecord.status_code = errorData.statusCode.toString()
    if (errorData.userAgent) errorRecord.user_agent = errorData.userAgent
    if (errorData.ip) errorRecord.ip = errorData.ip
    if (Object.keys(errorData.metadata).length > 0) {
      errorRecord.metadata = JSON.stringify(errorData.metadata)
    }
    
    await KV.hsetall(errorKey, errorRecord)
    
    // Set TTL for error logs (keep for 90 days)
    await KV.expire(errorKey, 90 * 24 * 60 * 60)
    
    return errorLog
  } catch (error) {
    console.error('Failed to create error log:', error)
    throw error
  }
}

async function updateErrorResolution(
  errorId: string, 
  resolved: boolean, 
  resolvedBy: string, 
  resolveNotes?: string
) {
  try {
    const errorKey = `error:log:${errorId}`
    const updateData: Record<string, string> = {
      resolved: resolved ? '1' : '0',
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString()
    }
    
    if (resolveNotes) {
      updateData.resolve_notes = resolveNotes
    }
    
    await KV.hsetall(errorKey, updateData)
  } catch (error) {
    console.error('Failed to update error resolution:', error)
    throw error
  }
}

async function sendCriticalErrorAlert(errorLog: ErrorLog) {
  try {
    // This would integrate with your alerting system (email, Slack, etc.)
    console.log(`🚨 CRITICAL ERROR ALERT: ${errorLog.message}`)
    console.log(`Category: ${errorLog.category}, Endpoint: ${errorLog.endpoint}`)
    
    // Store critical error alert
    const alertKey = `critical:alert:${errorLog.id}`
    await KV.hsetall(alertKey, {
      error_id: errorLog.id,
      message: errorLog.message,
      category: errorLog.category,
      level: errorLog.level,
      timestamp: errorLog.timestamp,
      alerted_at: new Date().toISOString()
    })
    
    // Set TTL for critical alerts (keep for 30 days)
    await KV.expire(alertKey, 30 * 24 * 60 * 60)
    
  } catch (error) {
    console.error('Failed to send critical error alert:', error)
  }
}