import { NextRequest, NextResponse } from 'next/server'
import { ATHDetector } from '@/lib/ath-detector'
import { KV } from '@/lib/kv'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security - check both CRON_SECRET and CRON_SECRET_KEY
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET_KEY || process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('❌ CRON_SECRET_KEY not configured in environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized cron access attempt:', authHeader?.substring(0, 20) + '...')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting crypto data update...')
    const startTime = Date.now()
    const cronRunTime = new Date().toISOString()

    // Track cron execution
    await KV['sadd']?.('cron:runs', cronRunTime)
    await KV['set']?.('cron:last_run', cronRunTime)

    // Run ATH detection
    const notifications = await ATHDetector.runDetection()

    const duration = Date.now() - startTime
    console.log(`✅ Crypto update completed in ${duration}ms`)
    console.log(`📊 Found ${notifications.length} new ATHs`)

    // Update cron status
    await KV['set']?.('cron:last_duration', duration.toString())
    await KV['set']?.('cron:last_ath_count', notifications.length.toString())

    return NextResponse.json({
      success: true,
      duration,
      athCount: notifications.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Crypto update failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
