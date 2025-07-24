import { NextRequest, NextResponse } from 'next/server'
import { KV } from '@/lib/kv'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Test database connectivity
    const dbTest = await testDatabaseConnection()
    
    // Test external API connectivity
    const externalApiTest = await testExternalApis()
    
    // Calculate response time
    const responseTime = Date.now() - startTime
    
    // Determine overall health status
    const isHealthy = dbTest.healthy && externalApiTest.coingecko.healthy
    
    const healthData = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: `${responseTime}ms`,
      services: {
        database: dbTest,
        externalApis: externalApiTest,
        email: await testEmailService()
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    }
    
    return NextResponse.json(healthData, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        database: { healthy: false, error: 'Connection failed' },
        externalApis: { healthy: false, error: 'API check failed' },
        email: { healthy: false, error: 'Service check failed' }
      }
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}

async function testDatabaseConnection() {
  try {
    const testKey = 'health:check:' + Date.now()
    const testValue = 'healthy'
    
    // Test write
    await KV.set(testKey, testValue, { ex: 60 })
    
    // Test read
    const result = await KV.get(testKey)
    
    // Cleanup
    await KV.del(testKey)
    
    return {
      healthy: result === testValue,
      responseTime: 'fast',
      lastChecked: new Date().toISOString()
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString()
    }
  }
}

async function testExternalApis() {
  const results = {
    coingecko: { healthy: false, responseTime: 'unknown', lastChecked: new Date().toISOString() }
  }
  
  try {
    const startTime = Date.now()
    const response = await fetch('https://api.coingecko.com/api/v3/ping', {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })
    
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      const data = await response.json()
      results.coingecko = {
        healthy: data.gecko_says === '(V3) To the Moon!',
        responseTime: `${responseTime}ms`,
        lastChecked: new Date().toISOString()
      }
    } else {
      results.coingecko = {
        healthy: false,
        error: `HTTP ${response.status}`,
        responseTime: `${responseTime}ms`,
        lastChecked: new Date().toISOString()
      }
    }
  } catch (error) {
    results.coingecko = {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: 'timeout',
      lastChecked: new Date().toISOString()
    }
  }
  
  return results
}

async function testEmailService() {
  try {
    // Simple check if Resend API key is configured
    const hasApiKey = !!process.env.RESEND_API_KEY
    
    return {
      healthy: hasApiKey,
      configured: hasApiKey,
      lastChecked: new Date().toISOString()
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString()
    }
  }
}