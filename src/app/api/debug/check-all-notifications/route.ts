import { NextResponse } from 'next/server'
import { KV } from '@/lib/kv'

export async function GET() {
  try {
    console.log('🔍 Checking all notifications in system')
    
    // Get recent notifications from the global timeline
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const recentNotifications = await KV.getNotificationsSince(twentyFourHoursAgo)
    
    console.log(`Found ${recentNotifications.length} notifications in last 24 hours`)
    
    // Get all notification IDs from timeline to see total count
    const allNotificationIds = await KV.zrange('notifications:timeline', 0, -1) || []
    console.log(`Total notifications in system: ${allNotificationIds.length}`)
    
    // Test the specific BNB notification we sent earlier
    const bnbNotifications = recentNotifications.filter(n => 
      n.cryptoId === 'binancecoin' || n.id === 'Ly8HYqWkzCmbP9oD'
    )
    
    console.log(`BNB notifications found: ${bnbNotifications.length}`)
    
    // Check user notification histories for all users
    const allUsers = await KV.getAllUsers()
    const userNotificationCounts = await Promise.all(
      allUsers.slice(0, 5).map(async (user) => { // Check first 5 users
        const notifications = await KV.getUserNotificationHistory(user.id, 10)
        return {
          email: user.email,
          id: user.id,
          notificationCount: notifications.length,
          notifications: notifications.map(n => ({
            id: n.id,
            cryptoId: n.cryptoId,
            newATH: n.newATH,
            sentAt: n.sentAt
          }))
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      data: {
        systemStats: {
          totalNotifications: allNotificationIds.length,
          recentNotifications: recentNotifications.length,
          bnbNotifications: bnbNotifications.length
        },
        recentNotifications: recentNotifications.map(n => ({
          id: n.id,
          cryptoId: n.cryptoId,
          newATH: n.newATH,
          previousATH: n.previousATH,
          sentAt: n.sentAt,
          recipientCount: n.recipientCount
        })),
        bnbNotifications: bnbNotifications.map(n => ({
          id: n.id,
          cryptoId: n.cryptoId,
          newATH: n.newATH,
          previousATH: n.previousATH,
          sentAt: n.sentAt,
          recipientCount: n.recipientCount
        })),
        userNotificationCounts
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Check all notifications error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}