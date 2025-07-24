import { NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { ATHDetector } from '@/lib/ath-detector'

export async function POST() {
  try {
    // Require admin authentication for manual updates
    await Auth.requireAdmin()

    console.log('🔄 Manual crypto data update triggered')
    const startTime = Date.now()

    const notifications = await ATHDetector.runDetection()

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      duration,
      athCount: notifications.length,
      notifications,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
