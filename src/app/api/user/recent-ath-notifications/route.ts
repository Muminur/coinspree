import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { KV } from '@/lib/kv'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await Auth.requireAuth()
    
    // Get query parameters
    const url = new URL(request.url)
    const hoursParam = url.searchParams.get('hours')
    const limitParam = url.searchParams.get('limit')
    
    const hours = hoursParam ? parseInt(hoursParam) : 168 // Default 7 days
    const limit = limitParam ? parseInt(limitParam) : 10 // Default 10 notifications
    
    // Get user notification history
    const userNotifications = await KV.getUserNotificationHistory(session.userId, 50)
    
    // Get the time cutoff
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    
    // Filter recent notifications and transform data
    const recentNotifications = userNotifications
      .filter(notification => notification.sentAt >= cutoffTime)
      .slice(0, limit)
    
    // Transform notifications into dashboard format
    const transformedNotifications = await Promise.all(
      recentNotifications.map(async (notification) => {
        try {
          // Get crypto details from our stored data
          const cryptoData = await KV.getCrypto(notification.cryptoId)
          
          // Calculate percentage increase
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
            athDate: notification.sentAt, // Use when notification was sent
            sentAt: notification.sentAt,
            recipientCount: notification.recipientCount || 0
          }
        } catch (error) {
          console.error(`Error transforming notification ${notification.id}:`, error)
          
          // Return fallback data if crypto lookup fails
          return {
            id: notification.id,
            cryptoId: notification.cryptoId,
            symbol: notification.cryptoId.toUpperCase(),
            name: notification.cryptoId,
            newATH: notification.newATH || 0,
            previousATH: notification.previousATH || 0,
            percentageIncrease: notification.previousATH > 0 
              ? ((notification.newATH - notification.previousATH) / notification.previousATH) * 100
              : 0,
            athDate: notification.sentAt,
            sentAt: notification.sentAt,
            recipientCount: notification.recipientCount || 0
          }
        }
      })
    )
    
    // Sort by date (most recent first)
    transformedNotifications.sort((a, b) => 
      new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    )
    
    return NextResponse.json({
      success: true,
      athRecords: transformedNotifications,
      data: transformedNotifications, // Keep both for compatibility
      count: transformedNotifications.length,
      totalUserNotifications: userNotifications.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Recent ATH notifications error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get recent ATH notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}