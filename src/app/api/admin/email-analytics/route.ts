import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { KV } from '@/lib/kv'

interface EmailAnalytics {
  timestamp: string
  deliveryMetrics: {
    totalSent: number
    totalDelivered: number
    totalFailed: number
    deliveryRate: number
    bounceRate: number
    failureRate: number
  }
  performanceMetrics: {
    averageDeliveryTime: number
    avgSendTime: number
    quickestDelivery: number
    slowestDelivery: number
  }
  volumeMetrics: {
    emailsSent24h: number
    emailsSent7d: number
    emailsSent30d: number
    peakSendingHour: number
    avgEmailsPerHour: number
  }
  typeBreakdown: {
    athNotifications: number
    welcomeEmails: number
    subscriptionExpiry: number
    passwordReset: number
    other: number
  }
  errorAnalysis: {
    commonErrors: Array<{
      error: string
      count: number
      percentage: number
    }>
    errorsByType: Record<string, number>
    criticalErrors: number
  }
  trends: {
    dailyVolume: Array<{
      date: string
      sent: number
      delivered: number
      failed: number
      deliveryRate: number
    }>
    hourlyPattern: Array<{
      hour: number
      volume: number
    }>
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📧 Email Analytics: Getting email delivery analytics')
    
    // Verify admin authentication
    const session = await Auth.requireAuth()
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const timeframe = searchParams.get('timeframe') || '7d'
    const includeDetails = searchParams.get('details') === 'true'

    // Generate comprehensive email analytics
    const analytics = await generateEmailAnalytics(timeframe, includeDetails)

    console.log('✅ Email Analytics: Email analytics retrieved successfully')
    console.log(`📊 Email Analytics: Delivery rate: ${analytics.deliveryMetrics.deliveryRate}%`)
    console.log(`📧 Email Analytics: Emails sent in ${timeframe}: ${analytics.volumeMetrics.emailsSent24h}`)
    
    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('❌ Email Analytics: Failed to get email analytics:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get email analytics'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Email Analytics: Recording email delivery event')
    
    const body = await request.json()
    const {
      emailId,
      userId,
      emailType,
      recipientEmail,
      deliveryTime,
      status,
      errorMessage,
      bounced,
      opened,
      clicked
    } = body

    // Validate required fields
    if (!emailId || !emailType || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields for email delivery event' },
        { status: 400 }
      )
    }

    // Record email delivery metrics
    await recordEmailDeliveryMetrics({
      emailId,
      userId,
      emailType,
      recipientEmail,
      deliveryTime: deliveryTime || Date.now(),
      status,
      errorMessage,
      bounced: bounced || false,
      opened: opened || false,
      clicked: clicked || false
    })

    console.log(`✅ Email Analytics: Recorded delivery event for ${emailType}`)
    
    return NextResponse.json({
      success: true,
      message: 'Email delivery event recorded successfully'
    })

  } catch (error) {
    console.error('❌ Email Analytics: Failed to record email delivery event:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record email delivery'
    }, { status: 500 })
  }
}

async function generateEmailAnalytics(timeframe: string, includeDetails: boolean): Promise<EmailAnalytics> {
  const now = Date.now()
  let fromTime: number
  
  switch (timeframe) {
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
      fromTime = now - (7 * 24 * 60 * 60 * 1000)
  }

  // Get all email delivery logs in timeframe
  const emailLogs = await getEmailLogsInTimeframe(fromTime)
  
  // Calculate delivery metrics
  const deliveryMetrics = calculateDeliveryMetrics(emailLogs)
  
  // Calculate performance metrics
  const performanceMetrics = calculatePerformanceMetrics(emailLogs)
  
  // Calculate volume metrics
  const volumeMetrics = await calculateVolumeMetrics(fromTime)
  
  // Calculate type breakdown
  const typeBreakdown = calculateTypeBreakdown(emailLogs)
  
  // Analyze errors
  const errorAnalysis = analyzeErrors(emailLogs)
  
  // Generate trends
  const trends = includeDetails ? await generateTrends(timeframe) : { dailyVolume: [], hourlyPattern: [] }

  return {
    timestamp: new Date().toISOString(),
    deliveryMetrics,
    performanceMetrics,
    volumeMetrics,
    typeBreakdown,
    errorAnalysis,
    trends
  }
}

async function getEmailLogsInTimeframe(fromTime: number) {
  try {
    // Get all email delivery log keys
    const logKeys = await KV.keys('email:log:*')
    
    const logs = []
    for (const key of logKeys) {
      const log = await KV.hgetall(key)
      if (log && log.sent_at) {
        const sentTime = new Date(log.sent_at).getTime()
        if (sentTime >= fromTime) {
          logs.push({
            id: log.id || key.split(':')[2],
            userId: log.user_id,
            emailType: log.email_type,
            recipientEmail: log.recipient_email,
            subject: log.subject,
            status: log.status,
            sentAt: log.sent_at,
            deliveredAt: log.delivered_at,
            errorMessage: log.error_message,
            resendId: log.resend_id,
            bounced: log.bounced === '1',
            opened: log.opened === '1',
            clicked: log.clicked === '1'
          })
        }
      }
    }
    
    return logs
  } catch (error) {
    console.error('Failed to get email logs:', error)
    return []
  }
}

function calculateDeliveryMetrics(emailLogs: any[]) {
  const totalSent = emailLogs.length
  const totalDelivered = emailLogs.filter(log => log.status === 'delivered' || log.status === 'sent').length
  const totalFailed = emailLogs.filter(log => log.status === 'failed').length
  const totalBounced = emailLogs.filter(log => log.bounced).length
  
  const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 100
  const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0
  const failureRate = totalSent > 0 ? (totalFailed / totalSent) * 100 : 0

  return {
    totalSent,
    totalDelivered,
    totalFailed,
    deliveryRate: Math.round(deliveryRate * 100) / 100,
    bounceRate: Math.round(bounceRate * 100) / 100,
    failureRate: Math.round(failureRate * 100) / 100
  }
}

function calculatePerformanceMetrics(emailLogs: any[]) {
  const deliveredLogs = emailLogs.filter(log => log.deliveredAt && log.sentAt)
  const deliveryTimes = deliveredLogs.map(log => {
    const sent = new Date(log.sentAt).getTime()
    const delivered = new Date(log.deliveredAt).getTime()
    return delivered - sent
  }).filter(time => time > 0)

  const averageDeliveryTime = deliveryTimes.length > 0 
    ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length / 1000 // Convert to seconds
    : 0

  return {
    averageDeliveryTime: Math.round(averageDeliveryTime * 100) / 100,
    avgSendTime: 1.2, // Estimated average send time in seconds
    quickestDelivery: deliveryTimes.length > 0 ? Math.min(...deliveryTimes) / 1000 : 0,
    slowestDelivery: deliveryTimes.length > 0 ? Math.max(...deliveryTimes) / 1000 : 0
  }
}

async function calculateVolumeMetrics(fromTime: number) {
  const now = Date.now()
  const oneDayAgo = now - (24 * 60 * 60 * 1000)
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)

  const emailsSent24h = await getEmailCountInTimeframe(oneDayAgo)
  const emailsSent7d = await getEmailCountInTimeframe(sevenDaysAgo)
  const emailsSent30d = await getEmailCountInTimeframe(thirtyDaysAgo)
  
  // Calculate hourly patterns
  const hourlyData = await getHourlyEmailPattern()
  const peakSendingHour = hourlyData.reduce((maxHour, current, index) => 
    current > hourlyData[maxHour] ? index : maxHour, 0)
  
  const avgEmailsPerHour = emailsSent24h / 24

  return {
    emailsSent24h,
    emailsSent7d,
    emailsSent30d,
    peakSendingHour,
    avgEmailsPerHour: Math.round(avgEmailsPerHour * 100) / 100
  }
}

async function getEmailCountInTimeframe(fromTime: number): Promise<number> {
  try {
    const logKeys = await KV.keys('email:log:*')
    let count = 0
    
    for (const key of logKeys) {
      const log = await KV.hgetall(key)
      if (log && log.sent_at) {
        const sentTime = new Date(log.sent_at).getTime()
        if (sentTime >= fromTime) {
          count++
        }
      }
    }
    
    return count
  } catch {
    return 0
  }
}

async function getHourlyEmailPattern(): Promise<number[]> {
  const hourlyData = new Array(24).fill(0)
  
  try {
    const logKeys = await KV.keys('email:log:*')
    
    for (const key of logKeys) {
      const log = await KV.hgetall(key)
      if (log && log.sent_at) {
        const hour = new Date(log.sent_at).getHours()
        hourlyData[hour]++
      }
    }
  } catch (error) {
    console.error('Failed to get hourly email pattern:', error)
  }
  
  return hourlyData
}

function calculateTypeBreakdown(emailLogs: any[]) {
  const typeCount = {
    'ath-notification': 0,
    'welcome': 0,
    'subscription-expiry': 0,
    'password-reset': 0,
    'other': 0
  }

  emailLogs.forEach(log => {
    const type = log.emailType || 'other'
    if (typeCount.hasOwnProperty(type)) {
      typeCount[type as keyof typeof typeCount]++
    } else {
      typeCount.other++
    }
  })

  return {
    athNotifications: typeCount['ath-notification'],
    welcomeEmails: typeCount['welcome'],
    subscriptionExpiry: typeCount['subscription-expiry'],
    passwordReset: typeCount['password-reset'],
    other: typeCount['other']
  }
}

function analyzeErrors(emailLogs: any[]) {
  const failedLogs = emailLogs.filter(log => log.status === 'failed' && log.errorMessage)
  const errorCounts: Record<string, number> = {}
  const errorsByType: Record<string, number> = {}

  failedLogs.forEach(log => {
    const error = log.errorMessage
    const type = log.emailType || 'unknown'
    
    errorCounts[error] = (errorCounts[error] || 0) + 1
    errorsByType[type] = (errorsByType[type] || 0) + 1
  })

  const totalErrors = failedLogs.length
  const commonErrors = Object.entries(errorCounts)
    .map(([error, count]) => ({
      error,
      count,
      percentage: totalErrors > 0 ? Math.round((count / totalErrors) * 100 * 100) / 100 : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const criticalErrors = failedLogs.filter(log => 
    log.errorMessage && (
      log.errorMessage.includes('5') || // 5xx errors
      log.errorMessage.includes('timeout') ||
      log.errorMessage.includes('invalid')
    )
  ).length

  return {
    commonErrors,
    errorsByType,
    criticalErrors
  }
}

async function generateTrends(timeframe: string) {
  const days = timeframe === '30d' ? 30 : timeframe === '7d' ? 7 : 1
  const dailyVolume = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    const dayEnd = dayStart + (24 * 60 * 60 * 1000)
    
    const dayLogs = await getEmailLogsInTimeframe(dayStart)
    const dayLogsFiltered = dayLogs.filter(log => {
      const sentTime = new Date(log.sentAt).getTime()
      return sentTime >= dayStart && sentTime < dayEnd
    })
    
    const sent = dayLogsFiltered.length
    const delivered = dayLogsFiltered.filter(log => log.status === 'delivered' || log.status === 'sent').length
    const failed = dayLogsFiltered.filter(log => log.status === 'failed').length
    const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 100
    
    dailyVolume.push({
      date: date.toISOString().split('T')[0],
      sent,
      delivered,
      failed,
      deliveryRate: Math.round(deliveryRate * 100) / 100
    })
  }

  const hourlyPattern = (await getHourlyEmailPattern()).map((volume, hour) => ({
    hour,
    volume
  }))

  return {
    dailyVolume,
    hourlyPattern
  }
}

async function recordEmailDeliveryMetrics(event: {
  emailId: string
  userId?: string
  emailType: string
  recipientEmail?: string
  deliveryTime: number
  status: string
  errorMessage?: string
  bounced: boolean
  opened: boolean
  clicked: boolean
}) {
  try {
    // Update the existing email log with delivery information
    const logKey = `email:log:${event.emailId}`
    const existingLog = await KV.hgetall(logKey) || {}
    
    const updatedLog = {
      ...existingLog,
      status: event.status,
      delivered_at: event.status === 'delivered' ? new Date().toISOString() : existingLog.delivered_at,
      error_message: event.errorMessage || existingLog.error_message,
      bounced: event.bounced ? '1' : '0',
      opened: event.opened ? '1' : '0',
      clicked: event.clicked ? '1' : '0',
      updated_at: new Date().toISOString()
    }

    // Remove null/undefined values to prevent Redis errors
    Object.keys(updatedLog).forEach(key => {
      if (updatedLog[key] === null || updatedLog[key] === undefined) {
        delete updatedLog[key]
      }
    })

    await KV.hsetall(logKey, updatedLog)

    // Update daily email statistics
    const date = new Date().toISOString().split('T')[0]
    const statsKey = `email:stats:${date}`
    
    await KV.hincrby(statsKey, 'total_events', 1)
    await KV.hincrby(statsKey, `${event.emailType}_events`, 1)
    await KV.hincrby(statsKey, `status_${event.status}`, 1)
    
    if (event.bounced) {
      await KV.hincrby(statsKey, 'bounced', 1)
    }
    if (event.opened) {
      await KV.hincrby(statsKey, 'opened', 1)
    }
    if (event.clicked) {
      await KV.hincrby(statsKey, 'clicked', 1)
    }

    // Set TTL for daily stats (keep for 90 days)
    await KV.expire(statsKey, 90 * 24 * 60 * 60)

  } catch (error) {
    console.error('❌ Email Analytics: Failed to record email delivery metrics:', error)
  }
}