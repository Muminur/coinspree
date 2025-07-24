import { NextRequest, NextResponse } from 'next/server'
import { SubscriptionAutomation } from '@/lib/subscription-automation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Starting subscription maintenance process...')

    // Run the full maintenance process
    const result = await SubscriptionAutomation.runMaintenanceProcess()

    // Get subscription statistics
    const stats = await SubscriptionAutomation.getSubscriptionStats()

    if (result.success) {
      console.log('Subscription maintenance completed successfully', {
        summary: result.summary,
        stats,
      })

      return NextResponse.json({
        success: true,
        data: {
          maintenance: result.summary,
          statistics: stats,
          timestamp: new Date().toISOString(),
        },
      })
    } else {
      console.error('Subscription maintenance completed with errors', {
        summary: result.summary,
        errors: result.errors,
        stats,
      })

      return NextResponse.json({
        success: false,
        data: {
          maintenance: result.summary,
          statistics: stats,
          errors: result.errors,
          timestamp: new Date().toISOString(),
        },
      })
    }
  } catch (error) {
    console.error('Subscription maintenance failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Subscription maintenance failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
