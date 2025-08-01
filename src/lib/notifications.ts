import { KV } from './kv'
import { sendATHNotificationEmail } from './email'
import { EmailQueue } from './email-queue'
import type {
  User,
  CryptoAsset,
  NotificationLog,
  ATHNotificationData,
} from '@/types'
import { StringUtils, DateUtils } from './utils'

export class NotificationService {
  /**
   * Send ATH notifications to all eligible subscribers
   */
  static async sendATHNotifications(
    coin: CryptoAsset,
    previousATH: number,
    notificationLog: NotificationLog
  ): Promise<{ success: boolean; recipientCount: number; errors: string[] }> {
    try {
      // Get all active subscribers with notifications enabled
      const eligibleUsers = await this.getEligibleUsers()

      console.log(`🔍 ATH Notification Check: Found ${eligibleUsers.length} eligible users for ${coin.symbol}`)
      eligibleUsers.forEach(user => {
        console.log(`  - ${user.email} (notifications: ${user.notificationsEnabled}, active: ${user.isActive})`)
      })

      if (eligibleUsers.length === 0) {
        console.log(`No eligible users for ATH notification: ${coin.symbol}`)
        return { success: true, recipientCount: 0, errors: [] }
      }

      // Prepare notification data - use the actual ATH price that was detected
      // For missed ATHs, this would be coin.ath, for real-time ATHs, this would be coin.currentPrice
      const actualATHPrice = coin.ath > coin.currentPrice ? coin.ath : coin.currentPrice
      
      const notificationData: ATHNotificationData = {
        cryptoName: coin.name,
        symbol: coin.symbol,
        newATH: actualATHPrice,
        previousATH,
        percentageIncrease: ((actualATHPrice - previousATH) / previousATH) * 100,
        athDate: coin.athDate || coin.lastUpdated, // Use ATH date when available
      }

      // Send notifications (using queue for better performance)
      const errors: string[] = []
      let successCount = 0

      // Process users in batches to avoid overwhelming the email service
      const batchSize = 50
      for (let i = 0; i < eligibleUsers.length; i += batchSize) {
        const batch = eligibleUsers.slice(i, i + batchSize)

        await Promise.allSettled(
          batch.map(async (user) => {
            try {
              await EmailQueue.addToQueue('ath_notification', user, {
                cryptoAsset: coin,
                newATH: notificationData.newATH,
                previousATH: notificationData.previousATH
              })
              successCount++

              // Log individual notification
              await this.logUserNotification(
                user.id,
                notificationLog.id,
                coin.id
              )
            } catch (error) {
              const errorMsg = `Failed to queue notification for ${user.email}: ${error}`
              errors.push(errorMsg)
              console.error(errorMsg)
            }
          })
        )

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      // Update notification log with recipient count
      await KV.updateNotificationRecipientCount(
        notificationLog.id,
        successCount
      )

      console.log(
        `ATH notification queued for ${successCount}/${eligibleUsers.length} users: ${coin.symbol}`
      )

      return {
        success: errors.length === 0,
        recipientCount: successCount,
        errors,
      }
    } catch (error) {
      console.error('Failed to send ATH notifications:', error)
      return {
        success: false,
        recipientCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  /**
   * Get all users eligible for notifications (active subscription + notifications enabled)
   */
  private static async getEligibleUsers(): Promise<User[]> {
    try {
      // Get all users
      const allUsers = await KV.getAllUsers()
      console.log(`📊 Checking ${allUsers.length} total users for ATH notification eligibility`)

      // Filter for eligible users
      const eligibleUsers: User[] = []

      for (const user of allUsers) {
        console.log(`  Checking user: ${user.email}`)
        
        // Check if user has notifications enabled and is not admin
        if (!user.notificationsEnabled || !user.isActive || user.role === 'admin') {
          console.log(`    ❌ Skipped: notifications=${user.notificationsEnabled}, active=${user.isActive}, role=${user.role}`)
          continue
        }

        // Check if user has active subscription
        const subscription = await KV.getUserSubscription(user.id)
        if (!subscription || subscription.status !== 'active') {
          console.log(`    ❌ Skipped: no subscription or status=${subscription?.status}`)
          continue
        }

        // Check if subscription is not expired
        const now = new Date()
        const endDate = new Date(subscription.endDate)
        if (now > endDate) {
          console.log(`    ❌ Skipped: subscription expired (${endDate.toISOString()})`)
          continue
        }

        console.log(`    ✅ Eligible: subscription active until ${endDate.toISOString()}`)
        eligibleUsers.push(user)
      }

      console.log(`📊 Final result: ${eligibleUsers.length} eligible users out of ${allUsers.length} total`)
      return eligibleUsers
    } catch (error) {
      console.error('Failed to get eligible users:', error)
      return []
    }
  }

  /**
   * Send test notification to a specific user
   */
  static async sendTestNotification(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await KV.getUser(userId)
      if (!user) {
        return { success: false, error: 'User not found' }
      }

      // Check if user has active subscription
      const subscription = await KV.getUserSubscription(userId)
      if (!subscription || subscription.status !== 'active') {
        return { success: false, error: 'Active subscription required' }
      }

      // Create test notification data
      const testData: ATHNotificationData = {
        cryptoName: 'Bitcoin',
        symbol: 'BTC',
        newATH: 50000,
        previousATH: 48000,
        percentageIncrease: 4.17,
        athDate: new Date().toISOString(),
      }

      // Send to actual user's email now that we have verified domain
      const targetUser = user

      const result = await sendATHNotificationEmail(targetUser, testData)

      if (result.success) {
        // Don't create permanent notification logs for test notifications
        // Test notifications are for immediate email testing only, not ATH history
        console.log('✅ Test notification sent successfully - no permanent log created')
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Update user notification preferences (requires active subscription)
   */
  static async updateNotificationPreferences(
    userId: string,
    enabled: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await KV.getUser(userId)
      if (!user) {
        return { success: false, error: 'User not found' }
      }

      // Check subscription status if trying to enable notifications
      if (enabled) {
        const subscription = await KV.getUserSubscription(userId)
        const hasActiveSubscription = subscription && 
          subscription.status === 'active' && 
          new Date(subscription.endDate) > new Date()

        if (!hasActiveSubscription) {
          return { 
            success: false, 
            error: 'Active subscription required to enable notifications' 
          }
        }

        // Admin users cannot enable notifications
        if (user.role === 'admin') {
          return { 
            success: false, 
            error: 'Admin users cannot enable notifications' 
          }
        }
      }

      const updatedUser = {
        ...user,
        notificationsEnabled: enabled,
      }

      await KV.updateUser(updatedUser)

      console.log(
        `Notification preferences updated for ${user.email}: ${enabled}`
      )

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update preferences',
      }
    }
  }

  /**
   * Get notification history for a user
   */
  static async getUserNotificationHistory(
    userId: string,
    limit: number = 50
  ): Promise<NotificationLog[]> {
    try {
      return await KV.getUserNotificationHistory(userId, limit)
    } catch (error) {
      console.error('Failed to get user notification history:', error)
      return []
    }
  }

  /**
   * Get recent notifications for admin dashboard
   */
  static async getRecentNotifications(
    hours: number = 24
  ): Promise<NotificationLog[]> {
    try {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      return await KV.getNotificationsSince(cutoff)
    } catch (error) {
      console.error('Failed to get recent notifications:', error)
      return []
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(days: number = 7): Promise<{
    totalNotifications: number
    totalRecipients: number
    averageRecipientsPerNotification: number
    uniqueCryptos: number
  }> {
    try {
      const cutoff = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000
      ).toISOString()
      const notifications = await KV.getNotificationsSince(cutoff)

      const totalNotifications = notifications.length
      const totalRecipients = notifications.reduce(
        (sum, n) => sum + n.recipientCount,
        0
      )
      const uniqueCryptos = new Set(notifications.map((n) => n.cryptoId)).size
      const averageRecipientsPerNotification =
        totalNotifications > 0 ? totalRecipients / totalNotifications : 0

      return {
        totalNotifications,
        totalRecipients,
        averageRecipientsPerNotification:
          Math.round(averageRecipientsPerNotification * 100) / 100,
        uniqueCryptos,
      }
    } catch (error) {
      console.error('Failed to get notification stats:', error)
      return {
        totalNotifications: 0,
        totalRecipients: 0,
        averageRecipientsPerNotification: 0,
        uniqueCryptos: 0,
      }
    }
  }

  /**
   * Log individual user notification for tracking
   */
  private static async logUserNotification(
    userId: string,
    notificationId: string,
    cryptoId: string
  ): Promise<void> {
    try {
      const logEntry = {
        userId,
        notificationId,
        cryptoId,
        sentAt: DateUtils.getCurrentISOString(),
      }

      await KV.saveUserNotificationLog(userId, logEntry)
    } catch (error) {
      console.error('Failed to log user notification:', error)
    }
  }

  /**
   * Cleanup old notifications (for maintenance)
   */
  static async cleanupOldNotifications(
    daysToKeep: number = 90
  ): Promise<number> {
    try {
      const cutoff = new Date(
        Date.now() - daysToKeep * 24 * 60 * 60 * 1000
      ).toISOString()
      return await KV.deleteNotificationsBefore(cutoff)
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error)
      return 0
    }
  }

  /**
   * Get users who need subscription expiry notifications
   */
  static async getUsersForExpiryNotification(
    daysBeforeExpiry: number = 3
  ): Promise<User[]> {
    try {
      const users = await KV.getAllUsers()
      const expiringUsers: User[] = []

      for (const user of users) {
        if (!user.isActive) continue

        const subscription = await KV.getUserSubscription(user.id)
        if (!subscription || subscription.status !== 'active') continue

        const expiryDate = new Date(subscription.endDate)
        const now = new Date()
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysUntilExpiry === daysBeforeExpiry) {
          expiringUsers.push(user)
        }
      }

      return expiringUsers
    } catch (error) {
      console.error('Failed to get users for expiry notification:', error)
      return []
    }
  }
}

// Notification frequency control
export class NotificationFrequencyControl {
  private static readonly MIN_INTERVAL_MINUTES = 5 // Minimum 5 minutes between notifications for same crypto

  /**
   * Check if we should send notification based on frequency limits
   */
  static async shouldSendNotification(cryptoId: string): Promise<boolean> {
    try {
      const lastNotification = await KV.getLastNotificationForCrypto(cryptoId)

      if (!lastNotification) {
        return true // No previous notification, so send it
      }

      const lastSentTime = new Date(lastNotification.sentAt)
      const now = new Date()
      const minutesSinceLastNotification =
        (now.getTime() - lastSentTime.getTime()) / (1000 * 60)

      return minutesSinceLastNotification >= this.MIN_INTERVAL_MINUTES
    } catch (error) {
      console.error('Error checking notification frequency:', error)
      return true // Default to sending if we can't check
    }
  }

  /**
   * Update last notification time for a crypto
   */
  static async updateLastNotificationTime(cryptoId: string): Promise<void> {
    try {
      await KV.setLastNotificationForCrypto(
        cryptoId,
        DateUtils.getCurrentISOString()
      )
    } catch (error) {
      console.error('Error updating last notification time:', error)
    }
  }
}
