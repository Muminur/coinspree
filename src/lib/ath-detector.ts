import { CoinGecko } from './coingecko'
import { KV } from './kv'
import {
  NotificationService,
  NotificationFrequencyControl,
} from './notifications'
import type { CryptoAsset, NotificationLog } from '@/types'
import { StringUtils, DateUtils } from './utils'

export class ATHDetector {
  static async runDetection(): Promise<NotificationLog[]> {
    try {
      // Fetch latest crypto data
      const currentData = await CoinGecko.getTop100()

      // Detect ATH updates
      const athUpdates = await CoinGecko.detectATHUpdates(currentData)

      // Process notifications for ATH updates
      const notifications: NotificationLog[] = []

      for (const coin of athUpdates) {
        // Use the previousATH from detectATHUpdates instead of fetching again
        const previousATH = coin.previousATH

        // Check if this is a genuine ATH (current price > previous) OR a missed ATH (CoinGecko ATH > previous)
        const isNewATH = coin.currentPrice > previousATH
        const isMissedATH = coin.ath > previousATH && coin.currentPrice <= previousATH
        
        if (isNewATH || isMissedATH) {
          // Determine the actual ATH price to notify about
          const athPrice = isMissedATH ? coin.ath : coin.currentPrice
          const athType = isMissedATH ? 'MISSED' : 'REAL-TIME'
          
          console.log(`🚀 ${athType} ATH DETECTED for ${coin.symbol}: $${athPrice}`)
          
          // Check if we should send notification based on frequency limits
          const shouldSend =
            await NotificationFrequencyControl.shouldSendNotification(coin.id)

          if (shouldSend) {
            const notification = await this.createNotificationLog(
              coin,
              previousATH,
              athPrice
            )
            notifications.push(notification)

            // Send email notifications to subscribers with correct ATH price
            const notificationCoin = isMissedATH ? { ...coin, currentPrice: athPrice } : coin
            const notificationResult =
              await NotificationService.sendATHNotifications(
                notificationCoin,
                previousATH,
                notification
              )

            // Update notification frequency control
            await NotificationFrequencyControl.updateLastNotificationTime(
              coin.id
            )

            // Log ATH detection with notification results
            await this.logATHDetection(
              notificationCoin,
              previousATH,
              notificationResult.recipientCount
            )

            console.log(
              `ATH notification sent to ${notificationResult.recipientCount} users for ${coin.symbol}`
            )
          } else {
            console.log(
              `Skipping ATH notification for ${coin.symbol} due to frequency limits`
            )
          }
        }
      }

      return notifications
    } catch (error) {
      console.error('ATH Detection failed:', error)
      return []
    }
  }

  private static async createNotificationLog(
    coin: CryptoAsset,
    previousATH: number,
    athPrice?: number
  ): Promise<NotificationLog> {
    const notification: NotificationLog = {
      id: StringUtils.generateId(16),
      cryptoId: coin.id,
      newATH: athPrice || coin.currentPrice,
      previousATH,
      sentAt: DateUtils.getCurrentISOString(),
      recipientCount: 0, // Will be updated when emails are sent
    }

    await KV.saveNotificationLog(notification)
    return notification
  }

  private static async logATHDetection(
    coin: CryptoAsset,
    previousATH: number,
    recipientCount: number = 0
  ): Promise<void> {
    const percentIncrease =
      ((coin.currentPrice - previousATH) / previousATH) * 100

    console.log(`🚀 NEW ATH DETECTED!
      Coin: ${coin.name} (${coin.symbol})
      New ATH: $${coin.currentPrice.toLocaleString()}
      Previous ATH: $${previousATH.toLocaleString()}
      Increase: ${(percentIncrease || 0).toFixed(2)}%
      Notifications sent: ${recipientCount} users
      Time: ${new Date().toISOString()}
    `)
  }

  static async getRecentATHs(hours: number = 24): Promise<NotificationLog[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    return await KV.getNotificationsSince(cutoff)
  }

  static async validateATH(cryptoId: string): Promise<boolean> {
    try {
      const stored = await KV.getCrypto(cryptoId)
      if (!stored) return false

      // Re-fetch from CoinGecko to verify
      const current = await CoinGecko.getTop100()
      const coin = current.find((c) => c.id === cryptoId)

      return coin ? coin.currentPrice >= stored.ath : false
    } catch {
      return false
    }
  }
}
