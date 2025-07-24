import { KV } from './kv'
import type { Subscription, User } from '@/types'

export class SubscriptionService {
  /**
   * Check if user has an active subscription
   */
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await KV.getUserSubscription(userId)

      if (!subscription) return false

      // Check status and expiry
      if (subscription.status !== 'active') return false

      const now = new Date()
      const endDate = new Date(subscription.endDate)

      const isActive = endDate > now

      // Auto-expire if needed
      if (!isActive && subscription.status === 'active') {
        await KV.updateSubscription(subscription.id, { status: 'expired' })
      }

      return isActive
    } catch (error) {
      console.error('Subscription check failed:', error)
      return false
    }
  }

  /**
   * Get subscription history for a user
   */
  static async getSubscriptionHistory(userId: string): Promise<Subscription[]> {
    try {
      return await KV.getUserSubscriptionHistory(userId)
    } catch (error) {
      console.error('Failed to fetch subscription history:', error)
      return []
    }
  }

  /**
   * Get subscription details with status
   */
  static async getSubscriptionDetails(userId: string): Promise<{
    hasSubscription: boolean
    subscription?: Subscription
    isActive: boolean
    daysRemaining: number
    status: string | null
  }> {
    try {
      const subscription = await KV.getUserSubscription(userId)

      if (!subscription) {
        return {
          hasSubscription: false,
          isActive: false,
          daysRemaining: 0,
          status: null,
        }
      }

      const now = new Date()
      const endDate = new Date(subscription.endDate)
      const isActive = subscription.status === 'active' && endDate > now

      // Calculate days remaining
      const daysRemaining = isActive
        ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0

      // Auto-expire if needed
      if (!isActive && subscription.status === 'active') {
        await KV.updateSubscription(subscription.id, { status: 'expired' })
        subscription.status = 'expired'
      }

      return {
        hasSubscription: true,
        subscription,
        isActive,
        daysRemaining,
        status: subscription.status,
      }
    } catch (error) {
      console.error('Subscription details fetch failed:', error)
      return {
        hasSubscription: false,
        isActive: false,
        daysRemaining: 0,
        status: null,
      }
    }
  }

  /**
   * Get list of users with active subscriptions (for notifications)
   */
  static async getActiveSubscribers(): Promise<
    Array<{
      user: User
      subscription: Subscription
    }>
  > {
    try {
      const users = await KV.getAllUsers()
      const activeSubscribers = []

      for (const user of users) {
        if (!user.isActive || !user.notificationsEnabled) continue

        const subscription = await KV.getUserSubscription(user.id)
        if (!subscription || subscription.status !== 'active') continue

        // Check if subscription is still valid
        const endDate = new Date(subscription.endDate)
        if (endDate <= new Date()) {
          // Auto-expire
          await KV.updateSubscription(subscription.id, { status: 'expired' })
          continue
        }

        // Get full user data
        const fullUser = await KV.getUserById(user.id)
        if (fullUser) {
          activeSubscribers.push({
            user: fullUser,
            subscription,
          })
        }
      }

      return activeSubscribers
    } catch (error) {
      console.error('Active subscribers fetch failed:', error)
      return []
    }
  }

  /**
   * Block a subscription (admin action)
   */
  static async blockSubscription(
    subscriptionId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const subscription = await KV.getSubscriptionById(subscriptionId)
      if (!subscription) return false

      await KV.updateSubscription(subscriptionId, {
        status: 'blocked',
      })

      console.log(
        `🚫 Subscription ${subscriptionId} blocked${reason ? `: ${reason}` : ''}`
      )
      return true
    } catch (error) {
      console.error('Subscription blocking failed:', error)
      return false
    }
  }

  /**
   * Extend subscription (admin action)
   */
  static async extendSubscription(
    subscriptionId: string,
    additionalDays: number
  ): Promise<boolean> {
    try {
      const subscription = await KV.getSubscriptionById(subscriptionId)
      if (!subscription) return false

      const currentEndDate = new Date(subscription.endDate)
      const newEndDate = new Date(
        currentEndDate.getTime() + additionalDays * 24 * 60 * 60 * 1000
      )

      await KV.updateSubscription(subscriptionId, {
        endDate: newEndDate.toISOString(),
        status: 'active', // Reactivate if expired
      })

      console.log(
        `📅 Subscription ${subscriptionId} extended by ${additionalDays} days`
      )
      return true
    } catch (error) {
      console.error('Subscription extension failed:', error)
      return false
    }
  }

  /**
   * Get subscription statistics (admin)
   */
  static async getSubscriptionStats(): Promise<{
    total: number
    active: number
    expired: number
    blocked: number
    revenue: number
  }> {
    try {
      const users = await KV.getAllUsers()
      const stats = {
        total: 0,
        active: 0,
        expired: 0,
        blocked: 0,
        revenue: 0,
      }

      for (const user of users) {
        const subscription = await KV.getUserSubscription(user.id)
        if (!subscription) continue

        stats.total++
        stats.revenue += subscription.amount

        // Check current status
        const now = new Date()
        const endDate = new Date(subscription.endDate)

        if (subscription.status === 'blocked') {
          stats.blocked++
        } else if (subscription.status === 'active' && endDate > now) {
          stats.active++
        } else {
          stats.expired++
          // Auto-expire if needed
          if (subscription.status === 'active') {
            await KV.updateSubscription(subscription.id, { status: 'expired' })
          }
        }
      }

      return stats
    } catch (error) {
      console.error('Subscription stats fetch failed:', error)
      return {
        total: 0,
        active: 0,
        expired: 0,
        blocked: 0,
        revenue: 0,
      }
    }
  }

  /**
   * Check if user can receive notifications
   */
  static async canReceiveNotifications(userId: string): Promise<boolean> {
    try {
      const user = await KV.getUserById(userId)
      if (!user?.isActive || !user.notificationsEnabled) return false

      return await this.hasActiveSubscription(userId)
    } catch (error) {
      console.error('Notification eligibility check failed:', error)
      return false
    }
  }

  /**
   * Validate subscription payment amount
   */
  static validatePaymentAmount(amount: number): boolean {
    const expectedAmount = parseFloat(
      process.env.SUBSCRIPTION_PRICE_USDT || '10'
    )
    const tolerance = expectedAmount * 0.01 // 1% tolerance

    return Math.abs(amount - expectedAmount) <= tolerance
  }

  /**
   * Get subscription configuration
   */
  static getSubscriptionConfig(): {
    priceUSDT: number
    durationDays: number
    walletAddress: string | undefined
  } {
    return {
      priceUSDT: parseFloat(process.env.SUBSCRIPTION_PRICE_USDT || '10'),
      durationDays: parseInt(process.env.SUBSCRIPTION_DURATION_DAYS || '30'),
      walletAddress: process.env.TRON_WALLET_ADDRESS,
    }
  }
}
