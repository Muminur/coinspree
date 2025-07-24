import { NextRequest, NextResponse } from 'next/server'
import { KV } from '@/lib/kv'
// import { sendAdminAlert } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = request.headers.get('authorization')
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startTime = Date.now()
    const healthCheck = {
      timestamp: new Date().toISOString(),
      services: {
        database: await checkDatabase(),
        coingeckoApi: await checkCoinGeckoApi(),
        emailService: await checkEmailService(),
        cronJobs: await checkCronJobs()
      },
      systemMetrics: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version
      }
    }

    // Calculate overall health
    const allServicesHealthy = Object.values(healthCheck.services).every(service => service.healthy)
    
    // Store health check result
    await KV.set('system:health:latest', healthCheck, { ex: 900 }) // 15 minutes TTL
    
    // Store historical health data
    const historicalKey = `system:health:${Date.now()}`
    await KV.set(historicalKey, healthCheck, { ex: 86400 }) // 24 hours TTL

    // Alert if services are unhealthy
    if (!allServicesHealthy) {
      await handleUnhealthyServices(healthCheck)
    }

    const executionTime = Date.now() - startTime

    const result = {
      success: true,
      overallHealth: allServicesHealthy ? 'healthy' : 'degraded',
      executionTime: `${executionTime}ms`,
      ...healthCheck
    }

    console.log('[CRON] Health check completed:', {
      overallHealth: result.overallHealth,
      executionTime: result.executionTime,
      unhealthyServices: Object.entries(healthCheck.services)
        .filter(([_, service]) => !service.healthy)
        .map(([name, _]) => name)
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[CRON] Health check failed:', error)
    
    // Try to alert about the health check failure
    try {
      await handleCriticalError(error)
    } catch (alertError) {
      console.error('[CRON] Failed to send health check alert:', alertError)
    }

    return NextResponse.json({
      success: false,
      overallHealth: 'critical',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
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

async function checkCronJobs(): Promise<{ healthy: boolean; lastCryptoUpdate?: string; error?: string }> {
  try {
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