import { NextRequest, NextResponse } from 'next/server'
import { KV } from '@/lib/kv'
import { EmailQueue } from '@/lib/email-queue'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting email queue processing...')
    const startTime = Date.now()
    const cronRunTime = new Date().toISOString()

    // Track cron execution
    await KV.sadd('cron:email_runs', cronRunTime)
    await KV.set('cron:email_last_run', cronRunTime)

    // Process pending emails from queue
    const processResult = await EmailQueue.processQueue()

    const duration = Date.now() - startTime
    console.log(`✅ Email queue processing completed in ${duration}ms`)
    console.log(`📧 Processed ${processResult.processed} emails`)
    console.log(`✅ Sent ${processResult.sent} emails successfully`)
    console.log(`❌ Failed ${processResult.failed} emails`)

    // Update cron status
    await KV.set('cron:email_last_duration', duration.toString())
    await KV.set('cron:email_processed_count', processResult.processed.toString())
    await KV.set('cron:email_sent_count', processResult.sent.toString())
    await KV.set('cron:email_failed_count', processResult.failed.toString())

    return NextResponse.json({
      success: true,
      duration,
      ...processResult,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Email queue processing failed:', error)
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