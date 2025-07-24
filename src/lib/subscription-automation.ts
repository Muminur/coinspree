import { KV } from './kv'
import { sendSubscriptionExpiryEmail } from './email'
import { NotificationService } from './notifications'

export class SubscriptionAutomation {
  /**
   * Send expiry warning emails for subscriptions expiring in specified days
   */
  static async sendExpiryWarnings(daysBeforeExpiry: number = 3): Promise<{
    success: boolean
    emailsSent: number
    errors: string[]
  }> {
    try {
      const expiringUsers =
        await NotificationService.getUsersForExpiryNotification(
          daysBeforeExpiry
        )

      if (expiringUsers.length === 0) {
        return { success: true, emailsSent: 0, errors: [] }
      }

      const errors: string[] = []
      let emailsSent = 0

      // Send expiry warnings to eligible users
      for (const user of expiringUsers) {
        try {
          const result = await sendSubscriptionExpiryEmail(
            user,
            daysBeforeExpiry
          )

          if (result.success) {
            emailsSent++
            console.log(
              `Expiry warning sent to ${user.email} (${daysBeforeExpiry} days)`
            )
          } else {
            errors.push(
              `Failed to send expiry warning to ${user.email}: ${result.error}`
            )
          }
        } catch (error) {
          const errorMsg = `Error sending expiry warning to ${user.email}: ${error}`
          errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      return {
        success: errors.length === 0,
        emailsSent,
        errors,
      }
    } catch (error) {
      console.error('Failed to send expiry warnings:', error)
      return {
        success: false,
        emailsSent: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  /**
   * Check and update expired subscriptions
   */
  static async processExpiredSubscriptions(): Promise<{
    success: boolean
    subscriptionsExpired: number
    errors: string[]
  }> {
    try {
      const users = await KV.getAllUsers()
      const errors: string[] = []
      let subscriptionsExpired = 0

      for (const user of users) {
        try {
          const subscription = await KV.getUserSubscription(user.id)

          if (!subscription || subscription.status !== 'active') {
            continue
          }

          // Check if subscription has expired
          const now = new Date()
          const endDate = new Date(subscription.endDate)

          if (now > endDate) {
            // Update subscription status to expired
            await KV.updateSubscription(subscription.id, {
              status: 'expired',
            })

            // Disable notifications for expired users
            if (user.notificationsEnabled) {
              await KV.updateUser(user.id, {
                notificationsEnabled: false,
              })
            }

            subscriptionsExpired++
            console.log(`Subscription expired for user ${user.email}`)
          }
        } catch (error) {
          const errorMsg = `Error processing subscription for ${user.email}: ${error}`
          errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      return {
        success: errors.length === 0,
        subscriptionsExpired,
        errors,
      }
    } catch (error) {
      console.error('Failed to process expired subscriptions:', error)
      return {
        success: false,
        subscriptionsExpired: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  /**
   * Full subscription maintenance process
   * - Send expiry warnings (7 days, 3 days, 1 day)
   * - Update expired subscriptions
   */
  static async runMaintenanceProcess(): Promise<{
    success: boolean
    summary: {
      expiryWarnings7Days: number
      expiryWarnings3Days: number
      expiryWarnings1Day: number
      subscriptionsExpired: number
    }
    errors: string[]
  }> {
    try {
      const allErrors: string[] = []

      // Send 7-day expiry warnings
      const warnings7Days = await this.sendExpiryWarnings(7)
      allErrors.push(...warnings7Days.errors)

      // Send 3-day expiry warnings
      const warnings3Days = await this.sendExpiryWarnings(3)
      allErrors.push(...warnings3Days.errors)

      // Send 1-day expiry warnings
      const warnings1Day = await this.sendExpiryWarnings(1)
      allErrors.push(...warnings1Day.errors)

      // Process expired subscriptions
      const expiredResult = await this.processExpiredSubscriptions()
      allErrors.push(...expiredResult.errors)

      const summary = {
        expiryWarnings7Days: warnings7Days.emailsSent,
        expiryWarnings3Days: warnings3Days.emailsSent,
        expiryWarnings1Day: warnings1Day.emailsSent,
        subscriptionsExpired: expiredResult.subscriptionsExpired,
      }

      console.log('Subscription maintenance completed:', summary)

      return {
        success: allErrors.length === 0,
        summary,
        errors: allErrors,
      }
    } catch (error) {
      console.error('Failed to run subscription maintenance:', error)
      return {
        success: false,
        summary: {
          expiryWarnings7Days: 0,
          expiryWarnings3Days: 0,
          expiryWarnings1Day: 0,
          subscriptionsExpired: 0,
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  /**
   * Get subscription health statistics
   */
  static async getSubscriptionStats(): Promise<{
    totalSubscriptions: number
    activeSubscriptions: number
    expiredSubscriptions: number
    expiringIn7Days: number
    expiringIn3Days: number
    expiringIn1Day: number
  }> {
    try {
      const users = await KV.getAllUsers()
      let totalSubscriptions = 0
      let activeSubscriptions = 0
      let expiredSubscriptions = 0
      let expiringIn7Days = 0
      let expiringIn3Days = 0
      let expiringIn1Day = 0

      const now = new Date()

      for (const user of users) {
        const subscription = await KV.getUserSubscription(user.id)

        if (!subscription) continue

        totalSubscriptions++

        const endDate = new Date(subscription.endDate)
        const daysUntilExpiry = Math.ceil(
          (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (subscription.status === 'expired' || now > endDate) {
          expiredSubscriptions++
        } else if (subscription.status === 'active') {
          activeSubscriptions++

          // Count expiring subscriptions
          if (daysUntilExpiry <= 7 && daysUntilExpiry > 3) {
            expiringIn7Days++
          } else if (daysUntilExpiry <= 3 && daysUntilExpiry > 1) {
            expiringIn3Days++
          } else if (daysUntilExpiry <= 1 && daysUntilExpiry >= 0) {
            expiringIn1Day++
          }
        }
      }

      return {
        totalSubscriptions,
        activeSubscriptions,
        expiredSubscriptions,
        expiringIn7Days,
        expiringIn3Days,
        expiringIn1Day,
      }
    } catch (error) {
      console.error('Failed to get subscription stats:', error)
      return {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        expiredSubscriptions: 0,
        expiringIn7Days: 0,
        expiringIn3Days: 0,
        expiringIn1Day: 0,
      }
    }
  }
}
