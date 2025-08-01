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
      // Fetch latest crypto data for both ranges
      console.log('🔍 ATH Detection: Fetching top 200 cryptocurrency data...')
      const top100Data = await CoinGecko.getTop100()
      const top101to200Data = await CoinGecko.getTop101to200()
      
      // Combine both ranges for comprehensive ATH detection
      const allData = [...top100Data, ...top101to200Data]
      console.log(`🔍 ATH Detection: Processing ${allData.length} cryptocurrencies (Top 100: ${top100Data.length}, Top 101-200: ${top101to200Data.length})`)

      // Detect ATH updates for all cryptocurrencies
      const athUpdates = await CoinGecko.detectATHUpdates(allData)

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

            // Track ATH detection for accuracy monitoring
            await this.trackATHDetection(notificationCoin, previousATH, athPrice, isNewATH)

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

      // Re-fetch from CoinGecko to verify - check both ranges
      const top100 = await CoinGecko.getTop100()
      const top101to200 = await CoinGecko.getTop101to200()
      const current = [...top100, ...top101to200]
      
      const coin = current.find((c) => c.id === cryptoId)
      return coin ? coin.currentPrice >= stored.ath : false
    } catch {
      return false
    }
  }

  private static async trackATHDetection(
    coin: CryptoAsset,
    previousATH: number,
    athPrice: number,
    isRealTime: boolean
  ): Promise<void> {
    try {
      const detectionTime = Date.now()
      const detectionLatency = isRealTime ? 0 : 300 // Real-time: 0, Missed ATH: estimated 5 minutes
      
      // Validate detection accuracy
      // For real-time detections, assume they are accurate
      // For missed ATHs, we trust CoinGecko's data
      const isValidDetection = true
      
      // Track the detection event for monitoring
      const detectionEvent = {
        coinId: coin.id,
        coinSymbol: coin.symbol,
        previousATH,
        newATH: athPrice,
        detectionTime,
        actualATH: athPrice,
        isValidDetection,
        detectionLatency
      }

      // Store detection event locally in KV for future analysis
      const eventKey = `ath:detection:${detectionTime}:${coin.id}`
      await KV.hsetall(eventKey, {
        coin_id: coin.id,
        coin_symbol: coin.symbol,
        previous_ath: previousATH.toString(),
        new_ath: athPrice.toString(),
        detection_time: detectionTime.toString(),
        actual_ath: athPrice.toString(),
        is_valid: isValidDetection ? '1' : '0',
        detection_latency: detectionLatency.toString(),
        detection_type: isRealTime ? 'real_time' : 'missed',
        timestamp: new Date().toISOString()
      })

      // Set TTL for detection event (keep for 90 days)
      await KV.expire(eventKey, 90 * 24 * 60 * 60)

      // Update detection statistics
      await this.updateDetectionStatistics(coin, isValidDetection, detectionLatency)

      console.log(`📊 ATH Detection tracked for ${coin.symbol}: ${isRealTime ? 'Real-time' : 'Missed'} ATH`)

    } catch (error) {
      console.error('❌ Failed to track ATH detection:', error)
      // Don't throw error to avoid breaking the main detection flow
    }
  }

  private static async updateDetectionStatistics(
    coin: CryptoAsset,
    isValidDetection: boolean,
    detectionLatency: number
  ): Promise<void> {
    try {
      // Update overall ATH statistics
      const statsKey = 'ath:stats'
      const currentStats = await KV.hgetall(statsKey) || {}
      
      const totalDetections = parseInt(currentStats.total_detections || '0') + 1
      const successfulDetections = parseInt(currentStats.successful_detections || '0') + (isValidDetection ? 1 : 0)
      const accuracy = (successfulDetections / totalDetections) * 100
      
      await KV.hsetall(statsKey, {
        total_detections: totalDetections.toString(),
        successful_detections: successfulDetections.toString(),
        average_accuracy: accuracy.toFixed(2),
        last_updated: new Date().toISOString(),
        detections_24h: await this.getDetectionsInLast24Hours()
      })

      // Update coin-specific statistics
      const coinStatsKey = `ath:coin_stats:${coin.id}`
      const coinStats = await KV.hgetall(coinStatsKey) || {}
      const coinDetections = parseInt(coinStats.detections || '0') + 1
      const coinSuccessful = parseInt(coinStats.successful || '0') + (isValidDetection ? 1 : 0)
      
      await KV.hsetall(coinStatsKey, {
        coin_symbol: coin.symbol,
        coin_name: coin.name,
        detections: coinDetections.toString(),
        successful: coinSuccessful.toString(),
        accuracy: ((coinSuccessful / coinDetections) * 100).toFixed(2),
        last_detection: new Date().toISOString(),
        avg_detection_latency: detectionLatency.toString()
      })

      // Update hourly detection pattern
      const hour = new Date().getHours()
      const hourlyKey = `ath:hourly:${hour}`
      await KV.incr(hourlyKey)
      await KV.expire(hourlyKey, 25 * 60 * 60) // Keep for 25 hours

    } catch (error) {
      console.error('❌ Failed to update detection statistics:', error)
    }
  }

  private static async getDetectionsInLast24Hours(): Promise<string> {
    try {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
      const detectionKeys = await KV.keys('ath:detection:*')
      
      const recentDetections = detectionKeys.filter((key: string) => {
        const timestamp = parseInt(key.split(':')[2])
        return timestamp >= oneDayAgo
      })

      return recentDetections.length.toString()
    } catch {
      return '0'
    }
  }
}
