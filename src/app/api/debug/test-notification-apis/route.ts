import { NextResponse } from 'next/server'
import { KV } from '@/lib/kv'

export async function GET() {
  try {
    console.log('🔧 Testing notification APIs logic')
    
    // Get a test user (use the owner account we know exists)
    const testUserEmail = 'muminurbsccl@gmail.com'
    const testUser = await KV.getUserByEmail(testUserEmail)
    
    if (!testUser) {
      return NextResponse.json({
        success: false,
        error: 'Test user not found'
      })
    }
    
    console.log(`Found test user: ${testUser.email}`)
    
    // Test notification count logic
    const notifications = await KV.getUserNotificationHistory(testUser.id)
    console.log(`User has ${notifications.length} total notifications`)
    
    // Count unique ATH notifications
    const uniqueATHNotifications = new Set()
    let totalNotifications = 0
    
    notifications.forEach(notification => {
      if (notification.cryptoId) {
        const notificationDate = new Date(notification.sentAt).toDateString()
        const uniqueKey = `${notification.cryptoId}-${notificationDate}`
        
        if (!uniqueATHNotifications.has(uniqueKey)) {
          uniqueATHNotifications.add(uniqueKey)
          totalNotifications++
        }
      }
    })
    
    console.log(`Unique ATH notifications: ${totalNotifications}`)
    
    // Test recent notifications logic
    const recentNotifications = notifications.slice(0, 3)
    const transformedNotifications = await Promise.all(
      recentNotifications.map(async (notification) => {
        const cryptoData = await KV.getCrypto(notification.cryptoId)
        const percentageIncrease = notification.previousATH > 0 
          ? ((notification.newATH - notification.previousATH) / notification.previousATH) * 100
          : 0
        
        return {
          id: notification.id,
          cryptoId: notification.cryptoId,
          symbol: cryptoData?.symbol || notification.cryptoId.toUpperCase(),
          name: cryptoData?.name || notification.cryptoId,
          newATH: notification.newATH,
          previousATH: notification.previousATH,
          percentageIncrease,
          athDate: notification.sentAt,
          sentAt: notification.sentAt
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      data: {
        testUser: {
          email: testUser.email,
          id: testUser.id
        },
        notificationStats: {
          totalNotifications,
          allTimeNotifications: notifications.length,
          uniqueNotifications: uniqueATHNotifications.size
        },
        recentNotifications: transformedNotifications,
        rawNotifications: notifications.map(n => ({
          id: n.id,
          cryptoId: n.cryptoId,
          newATH: n.newATH,
          previousATH: n.previousATH,
          sentAt: n.sentAt
        }))
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Test notification APIs error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}