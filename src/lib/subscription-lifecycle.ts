import { KV } from './kv'
import type { Subscription } from '@/types'

/**
 * Manages notification preferences based on subscription lifecycle events
 */
export class SubscriptionLifecycle {
  /**
   * Updates user notification preferences based on subscription status
   */
  static async updateNotificationPreferences(userId: string): Promise<void> {
    try {
      const user = await KV.getUserById(userId)
      if (!user) return

      // Get user's current subscription
      const subscription = await KV.getUserSubscription(userId)
      const hasActiveSubscription = subscription && 
        subscription.status === 'active' && 
        new Date(subscription.endDate) > new Date()

      // Admin users should never have notifications enabled
      // Only regular users with active subscriptions should have notifications
      const shouldEnableNotifications = hasActiveSubscription && user.role !== 'admin'

      // Update notification preference if it doesn't match subscription status
      if (user.notificationsEnabled !== shouldEnableNotifications) {
        await KV.updateUser(userId, { notificationsEnabled: shouldEnableNotifications })
        
        console.log(`📧 Updated notification preferences for ${user.email}:`, {
          subscriptionStatus: subscription?.status || 'none',
          notificationsEnabled: shouldEnableNotifications,
          reason: !hasActiveSubscription ? 'No active subscription' : 
                  user.role === 'admin' ? 'Admin user' : 'Active subscriber'
        })
      }
    } catch (error) {
      console.error('Failed to update notification preferences:', error)
    }
  }

  /**
   * Called when a subscription is activated
   */
  static async onSubscriptionActivated(subscription: Subscription): Promise<void> {
    console.log(`✅ Subscription activated for user ${subscription.userId}`)
    await this.updateNotificationPreferences(subscription.userId)
  }

  /**
   * Called when a subscription expires or is blocked
   */
  static async onSubscriptionDeactivated(subscription: Subscription): Promise<void> {
    console.log(`❌ Subscription deactivated for user ${subscription.userId}`)
    await this.updateNotificationPreferences(subscription.userId)
  }

  /**
   * Bulk update all users' notification preferences
   * Useful for fixing existing data or maintenance
   */
  static async syncAllNotificationPreferences(): Promise<void> {
    try {
      const allUsers = await KV.getAllUsers()
      console.log(`🔄 Syncing notification preferences for ${allUsers.length} users...`)
      
      let updated = 0
      for (const user of allUsers) {
        const oldEnabled = user.notificationsEnabled
        await this.updateNotificationPreferences(user.id)
        
        // Check if it was updated
        const updatedUser = await KV.getUserById(user.id)
        if (updatedUser && updatedUser.notificationsEnabled !== oldEnabled) {
          updated++
        }
      }
      
      console.log(`✅ Sync complete: ${updated} users had notification preferences updated`)
    } catch (error) {
      console.error('Failed to sync notification preferences:', error)
    }
  }
}