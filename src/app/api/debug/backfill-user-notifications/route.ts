import { NextResponse } from 'next/server'
import { KV } from '@/lib/kv'
import { DateUtils } from '@/lib/utils'

export async function POST() {
  try {
    console.log('🔧 Backfilling user notification logs')
    
    // Get recent notifications from the global system
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const recentNotifications = await KV.getNotificationsSince(twentyFourHoursAgo)
    
    console.log(`Found ${recentNotifications.length} recent notifications to backfill`)
    
    // Get all active subscribers (those who should have received the notifications)
    const allUsers = await KV.getAllUsers()
    const subscribedUsers = []
    
    for (const user of allUsers) {
      const subscription = await KV.getUserSubscription(user.id)
      if (subscription && subscription.status === 'active') {
        const now = new Date()
        const endDate = new Date(subscription.endDate)
        if (endDate > now && user.notificationsEnabled !== false) {
          subscribedUsers.push(user)
        }
      }
    }
    
    console.log(`Found ${subscribedUsers.length} subscribed users`)
    
    let backfilledCount = 0
    
    // Backfill notification logs for each subscribed user and each notification
    for (const notification of recentNotifications) {
      for (const user of subscribedUsers) {
        try {
          // Check if this user notification log already exists
          const existingLogs = await KV.getUserNotificationHistory(user.id, 100)
          const alreadyExists = existingLogs.some(log => log.id === notification.id)
          
          if (!alreadyExists) {
            const logEntry = {
              userId: user.id,
              notificationId: notification.id,
              cryptoId: notification.cryptoId,
              sentAt: notification.sentAt,
            }
            
            await KV.saveUserNotificationLog(user.id, logEntry)
            backfilledCount++
            
            console.log(`✅ Backfilled notification ${notification.id} for user ${user.email}`)
          } else {
            console.log(`⏭️ Notification ${notification.id} already exists for user ${user.email}`)
          }
        } catch (error) {
          console.error(`❌ Failed to backfill notification ${notification.id} for user ${user.email}:`, error)
        }
      }
    }
    
    console.log(`🎉 Backfilled ${backfilledCount} user notification logs`)
    
    // Test the result by checking one user
    const testUser = subscribedUsers[0]
    if (testUser) {
      const testUserNotifications = await KV.getUserNotificationHistory(testUser.id, 10)
      console.log(`Test user ${testUser.email} now has ${testUserNotifications.length} notifications`)
    }
    
    return NextResponse.json({
      success: true,
      data: {
        totalNotifications: recentNotifications.length,
        subscribedUsers: subscribedUsers.length,
        backfilledCount,
        testUser: testUser ? {
          email: testUser.email,
          notificationCount: testUser ? (await KV.getUserNotificationHistory(testUser.id, 10)).length : 0
        } : null
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Backfill user notifications error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Backfill failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}