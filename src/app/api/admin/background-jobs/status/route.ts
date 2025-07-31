import { NextRequest, NextResponse } from 'next/server'
import { KV } from '@/lib/kv'
import { BackgroundJobs } from '@/lib/background-jobs'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Admin endpoint to monitor background job status
 * Provides comprehensive monitoring data for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await KV.getUserById(session.userId)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get background job status
    const jobStatus = BackgroundJobs.getStatus()

    // Get recent execution data
    const [
      // Health check data
      healthLastRun,
      healthLastDuration,
      healthScore,
      healthStatus,
      healthIssues,

      // ATH detection data
      athLastRun,
      athLastDuration,
      athLastCount,
      athLastError,
      athLastErrorTime,

      // Subscription expiry data
      subscriptionLastRun,
      subscriptionLastDuration,
      subscriptionEmailsSent,
      subscriptionExpiredCount,

      // Email queue data
      emailLastRun,
      emailLastDuration,
      emailLastProcessed,
      emailLastSent,
      emailLastFailed,

      // System data
      cryptoLastUpdate,
    ] = await Promise.all([
      KV.get('cron:health_last_run'),
      KV.get('cron:health_last_duration'),
      KV.get('cron:health_score'),
      KV.get('cron:health_status'),
      KV.get('cron:health_issues'),

      KV.get('background:ath:last_run'),
      KV.get('background:ath:last_duration'),
      KV.get('background:ath:last_count'),
      KV.get('background:ath:last_error'),
      KV.get('background:ath:last_error_time'),

      KV.get('background:subscription:last_run'),
      KV.get('background:subscription:last_duration'),
      KV.get('background:subscription:emails_sent'),
      KV.get('background:subscription:expired_count'),

      KV.get('background:email:last_run'),
      KV.get('background:email:last_duration'),
      KV.get('background:email:last_processed'),
      KV.get('background:email:last_sent'),
      KV.get('background:email:last_failed'),

      KV.get('crypto:last_update'),
    ])

    // Calculate uptime and performance metrics
    const now = Date.now()
    const systemStartTime = jobStatus.startedAt ? new Date(jobStatus.startedAt).getTime() : now
    const systemUptime = now - systemStartTime

    // Parse health issues
    let parsedHealthIssues = []
    try {
      parsedHealthIssues = healthIssues ? JSON.parse(healthIssues) : []
    } catch {
      parsedHealthIssues = []
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      system: {
        backgroundJobs: {
          isRunning: jobStatus.isRunning,
          activeJobs: jobStatus.activeJobs,
          startedAt: jobStatus.startedAt,
          uptime: systemUptime,
          uptimeFormatted: formatDuration(systemUptime)
        },
        health: {
          lastCheck: healthLastRun,
          duration: healthLastDuration ? parseInt(healthLastDuration) : null,
          score: healthScore ? parseInt(healthScore) : 0,
          status: healthStatus || 'unknown',
          issues: parsedHealthIssues
        }
      },
      jobs: {
        athDetection: {
          lastRun: athLastRun,
          lastDuration: athLastDuration ? parseInt(athLastDuration) : null,
          lastCount: athLastCount ? parseInt(athLastCount) : null,
          lastError: athLastError,
          lastErrorTime: athLastErrorTime,
          status: athLastError ? 'error' : (athLastRun ? 'healthy' : 'never_ran'),
          nextExpectedRun: athLastRun ? new Date(new Date(athLastRun).getTime() + 1 * 60 * 1000).toISOString() : null
        },
        subscriptionExpiry: {
          lastRun: subscriptionLastRun,
          lastDuration: subscriptionLastDuration ? parseInt(subscriptionLastDuration) : null,
          emailsSent: subscriptionEmailsSent ? parseInt(subscriptionEmailsSent) : null,
          expiredCount: subscriptionExpiredCount ? parseInt(subscriptionExpiredCount) : null,
          status: subscriptionLastRun ? 'healthy' : 'never_ran',
          nextExpectedRun: subscriptionLastRun ? new Date(new Date(subscriptionLastRun).getTime() + 6 * 60 * 60 * 1000).toISOString() : null
        },
        emailQueue: {
          lastRun: emailLastRun,
          lastDuration: emailLastDuration ? parseInt(emailLastDuration) : null,
          lastProcessed: emailLastProcessed ? parseInt(emailLastProcessed) : null,
          lastSent: emailLastSent ? parseInt(emailLastSent) : null,
          lastFailed: emailLastFailed ? parseInt(emailLastFailed) : null,
          status: emailLastRun ? 'healthy' : 'never_ran',
          nextExpectedRun: emailLastRun ? new Date(new Date(emailLastRun).getTime() + 2 * 60 * 1000).toISOString() : null
        }
      },
      data: {
        cryptoLastUpdate,
        cryptoUpdateStatus: cryptoLastUpdate ? (
          (now - new Date(cryptoLastUpdate).getTime()) < 10 * 60 * 1000 ? 'recent' : 'stale'
        ) : 'never'
      }
    })

  } catch (error) {
    console.error('❌ Background job status check failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Admin endpoint to control background jobs
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await KV.getUserById(session.userId)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { action } = await request.json()

    switch (action) {
      case 'start':
        BackgroundJobs.start()
        await KV.set('admin:background_jobs:last_manual_start', new Date().toISOString())
        return NextResponse.json({ 
          success: true, 
          message: 'Background jobs started',
          status: BackgroundJobs.getStatus()
        })

      case 'stop':
        BackgroundJobs.stop()
        await KV.set('admin:background_jobs:last_manual_stop', new Date().toISOString())
        return NextResponse.json({ 
          success: true, 
          message: 'Background jobs stopped',
          status: BackgroundJobs.getStatus()
        })

      case 'restart':
        BackgroundJobs.stop()
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
        BackgroundJobs.start()
        await KV.set('admin:background_jobs:last_manual_restart', new Date().toISOString())
        return NextResponse.json({ 
          success: true, 
          message: 'Background jobs restarted',
          status: BackgroundJobs.getStatus()
        })

      case 'run_ath':
        const athResult = await BackgroundJobs.runATHDetection()
        return NextResponse.json({ 
          success: true, 
          message: 'ATH detection run manually',
          result: athResult
        })

      case 'run_subscription':
        const subscriptionResult = await BackgroundJobs.runSubscriptionExpiry()
        return NextResponse.json({ 
          success: true, 
          message: 'Subscription expiry check run manually',
          result: subscriptionResult
        })

      case 'run_email':
        const emailResult = await BackgroundJobs.runEmailQueue()
        return NextResponse.json({ 
          success: true, 
          message: 'Email queue processed manually',
          result: emailResult
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Background job control failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}