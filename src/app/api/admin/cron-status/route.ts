import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { EmailQueue } from '@/lib/email-queue'

export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const session = await validateSession(request)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const job = searchParams.get('job')

    let cronData: any = {}

    switch (job) {
      case 'ath':
        const athLastRun = await KV.get('cron:last_run')
        const athDuration = await KV.get('cron:last_duration')
        const athCount = await KV.get('cron:last_ath_count')
        
        cronData = {
          lastRun: athLastRun || 'Never',
          duration: athDuration ? `${athDuration}ms` : 'N/A',
          athCount: athCount || '0',
          status: athLastRun ? 'active' : 'inactive'
        }
        break

      case 'subscription':
        const subLastRun = await KV.get('cron:subscription_last_run')
        const subDuration = await KV.get('cron:subscription_last_duration')
        const emailsSent = await KV.get('cron:subscription_emails_sent')
        const expiredCount = await KV.get('cron:subscription_expired_count')
        
        cronData = {
          lastRun: subLastRun || 'Never',
          duration: subDuration ? `${subDuration}ms` : 'N/A',
          emailsSent: emailsSent || '0',
          expiredCount: expiredCount || '0',
          status: subLastRun ? 'active' : 'scheduled'
        }
        break

      case 'email':
        const emailLastRun = await KV.get('cron:email_last_run')
        const emailDuration = await KV.get('cron:email_last_duration')
        const processedCount = await KV.get('cron:email_processed_count')
        const sentCount = await KV.get('cron:email_sent_count')
        const failedCount = await KV.get('cron:email_failed_count')
        
        // Get current queue status
        const queueStatus = await EmailQueue.getQueueStatus()
        
        cronData = {
          lastRun: emailLastRun || 'Never',
          duration: emailDuration ? `${emailDuration}ms` : 'N/A',
          processedCount: processedCount || '0',
          sentCount: sentCount || '0',
          failedCount: failedCount || '0',
          queueStatus,
          status: emailLastRun ? 'active' : 'scheduled'
        }
        break

      default:
        // Return all cron data
        const allCronData = await Promise.all([
          KV.get('cron:last_run'),
          KV.get('cron:subscription_last_run'),
          KV.get('cron:email_last_run')
        ])
        
        cronData = {
          ath: {
            lastRun: allCronData[0] || 'Never',
            status: allCronData[0] ? 'active' : 'inactive'
          },
          subscription: {
            lastRun: allCronData[1] || 'Never',
            status: allCronData[1] ? 'active' : 'scheduled'
          },
          email: {
            lastRun: allCronData[2] || 'Never',
            status: allCronData[2] ? 'active' : 'scheduled'
          }
        }
    }

    return NextResponse.json({
      success: true,
      data: cronData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cron status fetch error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch cron status' 
      },
      { status: 500 }
    )
  }
}