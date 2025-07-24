import { NextResponse } from 'next/server'
import { NotificationFrequencyControl } from '@/lib/notifications'
import { KV } from '@/lib/kv'

export async function GET() {
  try {
    console.log('🔍 Checking BNB notification frequency limits')
    
    const bnbId = 'binancecoin'
    
    // Check if we should send notification for BNB  
    const shouldSend = await NotificationFrequencyControl.shouldSendNotification(bnbId)
    console.log(`Should send BNB notification: ${shouldSend}`)
    
    // Get the last notification time
    const lastNotificationKey = `notification_frequency:${bnbId}`
    const lastNotificationTime = await KV['get']?.(lastNotificationKey)
    console.log(`Last BNB notification time: ${lastNotificationTime || 'Never'}`)
    
    // Get recent notifications for BNB
    const recentNotifications = await KV.getNotificationsSince(
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    )
    
    const bnbNotifications = recentNotifications.filter(n => n.cryptoId === bnbId)
    console.log(`Recent BNB notifications (24h): ${bnbNotifications.length}`)
    
    // Calculate time since last notification
    let timeSinceLastNotification = 'Never'
    if (lastNotificationTime) {
      const lastTime = new Date(lastNotificationTime as string)
      const now = new Date()
      const diffMinutes = Math.round((now.getTime() - lastTime.getTime()) / 1000 / 60)
      timeSinceLastNotification = `${diffMinutes} minutes ago`
    }
    
    return NextResponse.json({
      success: true,
      data: {
        bnbId,
        shouldSendNotification: shouldSend,
        lastNotificationTime: lastNotificationTime || 'Never',
        timeSinceLastNotification,
        recentNotificationsCount: bnbNotifications.length,
        recentNotifications: bnbNotifications.map(n => ({
          id: n.id,
          newATH: n.newATH,
          previousATH: n.previousATH,
          sentAt: n.sentAt,
          recipientCount: n.recipientCount
        }))
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Notification frequency debug error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Notification frequency debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}