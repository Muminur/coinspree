import { NextResponse } from 'next/server'
import { ATHDetector } from '@/lib/ath-detector'
import { KV } from '@/lib/kv'

export async function POST() {
  try {
    console.log('🔧 Debug: Manual cron execution started')
    const startTime = Date.now()
    const cronRunTime = new Date().toISOString()

    // Track cron execution
    await KV['sadd']?.('cron:runs', cronRunTime)
    await KV['set']?.('cron:last_run', cronRunTime)

    console.log('🔄 Starting ATH detection...')
    
    // Run ATH detection
    const notifications = await ATHDetector.runDetection()

    const duration = Date.now() - startTime
    console.log(`✅ Crypto update completed in ${duration}ms`)
    console.log(`📊 Found ${notifications.length} new ATHs`)

    // Update cron status
    await KV['set']?.('cron:last_duration', duration.toString())
    await KV['set']?.('cron:last_ath_count', notifications.length.toString())

    // Get detailed results
    const notificationDetails = notifications.map(n => ({
      cryptoId: n.cryptoId,
      newATH: n.newATH,
      previousATH: n.previousATH,
      sentAt: n.sentAt,
      recipientCount: n.recipientCount
    }))

    return NextResponse.json({
      success: true,
      message: `Manual cron execution completed successfully`,
      data: {
        duration,
        athCount: notifications.length,
        notifications: notificationDetails,
        cronRunTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Manual cron execution failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Manual cron execution failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}