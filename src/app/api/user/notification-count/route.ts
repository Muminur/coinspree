import { NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { KV } from '@/lib/kv'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Require authentication
    const session = await Auth.requireAuth()
    
    // Get user notification history
    const notifications = await KV.getUserNotificationHistory(session.userId)
    
    // Count unique ATH notifications (avoid duplicates by cryptoId per day)
    const uniqueATHNotifications = new Set()
    let totalNotifications = 0
    
    notifications.forEach(notification => {
      if (notification.cryptoId) {
        // Create unique key based on crypto and date to avoid counting duplicates
        const notificationDate = new Date(notification.sentAt).toDateString()
        const uniqueKey = `${notification.cryptoId}-${notificationDate}`
        
        if (!uniqueATHNotifications.has(uniqueKey)) {
          uniqueATHNotifications.add(uniqueKey)
          totalNotifications++
        }
      }
    })
    
    // Also get recent notifications (last 30 days) for more detailed stats
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const recentNotifications = notifications.filter(n => n.sentAt >= thirtyDaysAgo)
    
    // Get notifications from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const weeklyNotifications = notifications.filter(n => n.sentAt >= sevenDaysAgo)
    
    return NextResponse.json({
      success: true,
      data: {
        totalNotifications,
        recentNotifications: recentNotifications.length,
        weeklyNotifications: weeklyNotifications.length,
        allTimeNotifications: notifications.length
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ User notification count error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get notification count',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}