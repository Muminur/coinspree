import { NextRequest, NextResponse } from 'next/server'
import { KV } from '@/lib/kv'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = request.headers.get('authorization')
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startTime = Date.now()
    let cleanedSessions = 0
    let cleanedLogs = 0

    console.log('[CRON] Starting session cleanup...')

    // Clean up expired sessions (older than 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    
    try {
      // Get all session keys
      const sessionKeys = await KV.keys('session:*')
      console.log(`[CRON] Found ${sessionKeys.length} session keys to check`)

      for (const sessionKey of sessionKeys) {
        try {
          const session = await KV.get(sessionKey)
          if (session && typeof session === 'object' && 'createdAt' in session) {
            const sessionData = session as { createdAt: string }
            const sessionAge = Date.now() - new Date(sessionData.createdAt).getTime()
            
            if (sessionAge > sevenDaysAgo) {
              await KV.del(sessionKey)
              cleanedSessions++
            }
          } else {
            // Invalid session data, clean it up
            await KV.del(sessionKey)
            cleanedSessions++
          }
        } catch (error) {
          console.error(`[CRON] Error processing session ${sessionKey}:`, error)
          // Clean up corrupted session
          await KV.del(sessionKey)
          cleanedSessions++
        }
      }
    } catch (error) {
      console.error('[CRON] Error cleaning up sessions:', error)
    }

    // Clean up old notification logs (older than 90 days)
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000)
    
    try {
      const logKeys = await KV.keys('email:log:*')
      console.log(`[CRON] Found ${logKeys.length} email log keys to check`)

      for (const logKey of logKeys) {
        try {
          const log = await KV.get(logKey)
          if (log && typeof log === 'object' && 'sentAt' in log) {
            const logData = log as { sentAt: string }
            const logAge = Date.now() - new Date(logData.sentAt).getTime()
            
            if (logAge > ninetyDaysAgo) {
              await KV.del(logKey)
              cleanedLogs++
            }
          } else {
            // Invalid log data, clean it up
            await KV.del(logKey)
            cleanedLogs++
          }
        } catch (error) {
          console.error(`[CRON] Error processing log ${logKey}:`, error)
          // Clean up corrupted log
          await KV.del(logKey)
          cleanedLogs++
        }
      }
    } catch (error) {
      console.error('[CRON] Error cleaning up logs:', error)
    }

    // Clean up old rate limit keys (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    let cleanedRateLimits = 0
    
    try {
      const rateLimitKeys = await KV.keys('rate_limit:*')
      console.log(`[CRON] Found ${rateLimitKeys.length} rate limit keys to check`)

      for (const rateLimitKey of rateLimitKeys) {
        try {
          const ttl = await KV.ttl(rateLimitKey)
          if (ttl === -1 || ttl === -2) {
            // Key has no TTL or doesn't exist, clean it up
            await KV.del(rateLimitKey)
            cleanedRateLimits++
          }
        } catch (error) {
          console.error(`[CRON] Error processing rate limit ${rateLimitKey}:`, error)
          await KV.del(rateLimitKey)
          cleanedRateLimits++
        }
      }
    } catch (error) {
      console.error('[CRON] Error cleaning up rate limits:', error)
    }

    const executionTime = Date.now() - startTime

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      executionTime: `${executionTime}ms`,
      cleaned: {
        sessions: cleanedSessions,
        logs: cleanedLogs,
        rateLimits: cleanedRateLimits
      },
      statistics: {
        totalKeysProcessed: cleanedSessions + cleanedLogs + cleanedRateLimits,
        executionTimeMs: executionTime
      }
    }

    console.log('[CRON] Session cleanup completed:', result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[CRON] Session cleanup failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}