import { NextResponse } from 'next/server'
import { CoinGecko } from '@/lib/coingecko'
import { KV } from '@/lib/kv'
import { NotificationService } from '@/lib/notifications'
import { StringUtils, DateUtils } from '@/lib/utils'
import type { NotificationLog } from '@/types'

export async function POST() {
  try {
    console.log('🚀 Manually sending BNB ATH notification')
    
    // Get BNB data
    const allCoins = await CoinGecko.getTop100()
    const bnb = allCoins.find(coin => coin.symbol === 'BNB')
    
    if (!bnb) {
      return NextResponse.json({ success: false, error: 'BNB not found' })
    }
    
    // Use today's ATH values
    const newATH = 808.09 // BNB's ATH today
    const previousATH = 801.83 // Previous stored ATH
    
    // Create notification log
    const notification: NotificationLog = {
      id: StringUtils.generateId(16),
      cryptoId: bnb.id,
      newATH,
      previousATH,
      sentAt: DateUtils.getCurrentISOString(),
      recipientCount: 0, // Will be updated when emails are sent
    }
    
    console.log(`Creating notification for BNB ATH: $${newATH} (previous: $${previousATH})`)
    
    // Save notification log
    await KV.saveNotificationLog(notification)
    
    // Create a modified BNB object with the ATH price as current price for email template
    const bnbForNotification = {
      ...bnb,
      currentPrice: newATH // Use ATH price for email
    }
    
    // Send email notifications
    const notificationResult = await NotificationService.sendATHNotifications(
      bnbForNotification,
      previousATH,
      notification
    )
    
    console.log(`✅ BNB ATH notification sent to ${notificationResult.recipientCount} users`)
    
    return NextResponse.json({
      success: true,
      message: `BNB ATH notification sent successfully`,
      data: {
        cryptoId: bnb.id,
        symbol: bnb.symbol,
        name: bnb.name,
        newATH,
        previousATH,
        percentIncrease: ((newATH - previousATH) / previousATH * 100).toFixed(2),
        recipientCount: notificationResult.recipientCount,
        notificationId: notification.id,
        sentAt: notification.sentAt
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Manual BNB notification error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send BNB notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}