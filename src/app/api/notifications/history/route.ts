import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notifications'
import { validateSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Validate session
    const session = await validateSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const adminParam = searchParams.get('admin')
    const hoursParam = searchParams.get('hours')

    const limit = limitParam ? parseInt(limitParam, 10) : 50
    const isAdmin = session.role === 'admin' && adminParam === 'true'
    const hours = hoursParam ? parseInt(hoursParam, 10) : 24

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 100' },
        { status: 400 }
      )
    }

    let notifications
    let stats = null

    if (isAdmin) {
      // Admin can see all recent notifications
      notifications = await NotificationService.getRecentNotifications(hours)
      stats = await NotificationService.getNotificationStats(7) // Last 7 days stats
    } else {
      // Regular users see only their own notification history
      notifications = await NotificationService.getUserNotificationHistory(
        session.userId,
        limit
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        count: notifications.length,
        isAdmin,
        stats,
      },
    })
  } catch (error) {
    console.error('Failed to get notification history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get notification history' },
      { status: 500 }
    )
  }
}
