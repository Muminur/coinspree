import { NextRequest, NextResponse } from 'next/server'
import { KV } from '@/lib/kv'
import { BackgroundJobs } from '@/lib/background-jobs'

export const dynamic = 'force-dynamic'

/**
 * Health Check Cron Job
 * 
 * This is the ONLY cron job allowed on Vercel free tier.
 * It serves multiple purposes:
 * 1. Acts as a heartbeat to keep background jobs alive
 * 2. Monitors the health of all background processes
 * 3. Provides status information for admin monitoring
 * 4. Restarts background jobs if they stop running
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Health check cron job started...')
    const startTime = Date.now()
    const cronRunTime = new Date().toISOString()

    // Track this health check execution
    await KV.sadd('cron:health_runs', cronRunTime)
    await KV.set('cron:health_last_run', cronRunTime)
    await KV.set('cron:last_run', cronRunTime) // Maintain compatibility

    // Get background job status
    const jobStatus = BackgroundJobs.getStatus()
    
    // If background jobs are not running in production, restart them
    if (process.env.NODE_ENV === 'production' && !jobStatus.isRunning) {
      console.log('⚠️ Background jobs not running, attempting restart...')
      BackgroundJobs.start()
    }

    // Get recent job execution data for monitoring
    const athLastRun = await KV.get('background:ath:last_run')
    const athLastDuration = await KV.get('background:ath:last_duration')
    const athLastCount = await KV.get('background:ath:last_count')
    const athLastError = await KV.get('background:ath:last_error')

    const subscriptionLastRun = await KV.get('background:subscription:last_run')
    const subscriptionLastDuration = await KV.get('background:subscription:last_duration')
    const subscriptionEmailsSent = await KV.get('background:subscription:emails_sent')
    const subscriptionExpiredCount = await KV.get('background:subscription:expired_count')

    const emailLastRun = await KV.get('background:email:last_run')
    const emailLastDuration = await KV.get('background:email:last_duration')
    const emailLastProcessed = await KV.get('background:email:last_processed')
    const emailLastSent = await KV.get('background:email:last_sent')
    const emailLastFailed = await KV.get('background:email:last_failed')

    // Run service health checks
    const services = {
      database: await checkDatabase(),
      coingeckoApi: await checkCoinGeckoApi(),
      emailService: await checkEmailService(),
      backgroundJobs: await checkBackgroundJobs()
    }

    const duration = Date.now() - startTime
    console.log(`✅ Health check completed in ${duration}ms`)
    console.log(`📊 Background jobs status: ${jobStatus.isRunning ? 'RUNNING' : 'STOPPED'}`)

    // Update health check status
    await KV.set('cron:health_last_duration', duration.toString())
    await KV.set('cron:health_status', jobStatus.isRunning ? 'healthy' : 'unhealthy')

    // Calculate health score based on recent activity
    const now = Date.now()
    const oneMinuteAgo = now - (1 * 60 * 1000)
    const sixHoursAgo = now - (6 * 60 * 60 * 1000)
    const twoMinutesAgo = now - (2 * 60 * 1000)

    let healthScore = 100
    const issues = []

    // Check ATH detection health (should run every 1 minute)
    if (athLastRun) {
      const lastRunTime = new Date(athLastRun).getTime()
      if (lastRunTime < oneMinuteAgo - (30 * 1000)) { // 30 second tolerance
        healthScore -= 30
        issues.push('ATH detection overdue')
      }
    } else {
      healthScore -= 30
      issues.push('ATH detection never ran')
    }

    // Check subscription expiry health (should run every 6 hours)
    if (subscriptionLastRun) {
      const lastRunTime = new Date(subscriptionLastRun).getTime()
      if (lastRunTime < sixHoursAgo - (30 * 60 * 1000)) { // 30 minute tolerance
        healthScore -= 20
        issues.push('Subscription expiry check overdue')
      }
    } else {
      healthScore -= 20
      issues.push('Subscription expiry check never ran')
    }

    // Check email queue health (should run every 2 minutes)
    if (emailLastRun) {
      const lastRunTime = new Date(emailLastRun).getTime()
      if (lastRunTime < twoMinutesAgo - (60 * 1000)) { // 1 minute tolerance
        healthScore -= 25
        issues.push('Email queue processing overdue')
      }
    } else {
      healthScore -= 25
      issues.push('Email queue processing never ran')
    }

    // Check for recent errors
    if (athLastError) {
      healthScore -= 15
      issues.push('Recent ATH detection error')
    }

    // Service health checks
    const allServicesHealthy = Object.values(services).every(service => service.healthy)
    if (!allServicesHealthy) {
      healthScore -= 10
      issues.push('External service issues')
    }

    await KV.set('cron:health_score', healthScore.toString())
    await KV.set('cron:health_issues', JSON.stringify(issues))

    return NextResponse.json({
      success: true,
      healthCheck: {
        duration,
        timestamp: cronRunTime,
        healthScore,
        issues,
        backgroundJobs: {
          isRunning: jobStatus.isRunning,
          activeJobs: jobStatus.activeJobs,
          startedAt: jobStatus.startedAt
        },
        services
      },
      jobStatus: {
        ath: {
          lastRun: athLastRun,
          lastDuration: athLastDuration ? parseInt(athLastDuration) : null,
          lastCount: athLastCount ? parseInt(athLastCount) : null,
          lastError: athLastError
        },
        subscription: {
          lastRun: subscriptionLastRun,
          lastDuration: subscriptionLastDuration ? parseInt(subscriptionLastDuration) : null,
          emailsSent: subscriptionEmailsSent ? parseInt(subscriptionEmailsSent) : null,
          expiredCount: subscriptionExpiredCount ? parseInt(subscriptionExpiredCount) : null
        },
        email: {
          lastRun: emailLastRun,
          lastDuration: emailLastDuration ? parseInt(emailLastDuration) : null,
          lastProcessed: emailLastProcessed ? parseInt(emailLastProcessed) : null,
          lastSent: emailLastSent ? parseInt(emailLastSent) : null,
          lastFailed: emailLastFailed ? parseInt(emailLastFailed) : null
        }
      }
    })

  } catch (error) {
    console.error('❌ Health check failed:', error)
    
    // Update error status
    await KV.set('cron:health_last_error', (error as Error).message)
    await KV.set('cron:health_last_error_time', new Date().toISOString())
    await KV.set('cron:health_status', 'error')
    await KV.set('cron:health_score', '0')

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
        healthScore: 0
      },
      { status: 500 }
    )
  }
}

async function checkDatabase(): Promise<{ healthy: boolean; responseTime?: string; error?: string }> {
  try {
    const startTime = Date.now()
    const testKey = `health:db:${Date.now()}`
    
    await KV.set(testKey, 'test', { ex: 60 })
    const result = await KV.get(testKey)
    await KV.del(testKey)
    
    const responseTime = Date.now() - startTime
    
    return {
      healthy: result === 'test',
      responseTime: `${responseTime}ms`
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkCoinGeckoApi(): Promise<{ healthy: boolean; responseTime?: string; error?: string }> {
  try {
    const startTime = Date.now()
    const response = await fetch('https://api.coingecko.com/api/v3/ping', {
      signal: AbortSignal.timeout(10000)
    })
    
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      const data = await response.json()
      return {
        healthy: data.gecko_says === '(V3) To the Moon!',
        responseTime: `${responseTime}ms`
      }
    } else {
      return {
        healthy: false,
        error: `HTTP ${response.status}`,
        responseTime: `${responseTime}ms`
      }
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkEmailService(): Promise<{ healthy: boolean; configured: boolean; error?: string }> {
  try {
    const hasApiKey = !!process.env.RESEND_API_KEY
    const hasFromAddress = !!process.env.EMAIL_FROM_ADDRESS
    
    return {
      healthy: hasApiKey && hasFromAddress,
      configured: hasApiKey && hasFromAddress
    }
  } catch (error) {
    return {
      healthy: false,
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkBackgroundJobs(): Promise<{ healthy: boolean; lastCryptoUpdate?: string; error?: string }> {
  try {
    // Check if background jobs are running
    const jobStatus = BackgroundJobs.getStatus()
    
    if (!jobStatus.isRunning) {
      return {
        healthy: false,
        error: 'Background jobs not running'
      }
    }
    
    // Check when crypto data was last updated
    const lastUpdate = await KV.get('crypto:last_update')
    
    if (lastUpdate) {
      const lastUpdateTime = new Date(lastUpdate as string)
      const timeSinceUpdate = Date.now() - lastUpdateTime.getTime()
      const fiveMinutesInMs = 5 * 60 * 1000
      
      return {
        healthy: timeSinceUpdate < fiveMinutesInMs,
        lastCryptoUpdate: lastUpdateTime.toISOString()
      }
    } else {
      return {
        healthy: false,
        error: 'No crypto update timestamp found'
      }
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function handleUnhealthyServices(healthCheck: any) {
  try {
    const unhealthyServices = Object.entries(healthCheck.services)
      .filter(([_, service]: [string, any]) => !service.healthy)
      .map(([name, service]: [string, any]) => ({
        name,
        error: service.error || 'Unknown error'
      }))

    console.warn('[CRON] Unhealthy services detected:', unhealthyServices)

    // Store alert in database for admin dashboard
    const alertKey = `system:alert:${Date.now()}`
    await KV.set(alertKey, {
      type: 'service_degradation',
      severity: 'warning',
      timestamp: new Date().toISOString(),
      services: unhealthyServices,
      fullHealthCheck: healthCheck
    }, { ex: 86400 }) // 24 hours

    // In production, you might want to send email alerts here
    // await sendAdminAlert('Service Health Alert', unhealthyServices)
    console.warn('[CRON] Would send admin alert for unhealthy services:', unhealthyServices)
  } catch (error) {
    console.error('[CRON] Failed to handle unhealthy services:', error)
  }
}

async function handleCriticalError(error: unknown) {
  try {
    const alertKey = `system:alert:critical:${Date.now()}`
    await KV.set(alertKey, {
      type: 'health_check_failure',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { ex: 86400 }) // 24 hours

    console.error('[CRON] Critical health check failure logged')
  } catch (alertError) {
    console.error('[CRON] Failed to log critical error:', alertError)
  }
}