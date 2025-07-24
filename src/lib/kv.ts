// Conditional KV import to prevent build errors
let kv: any
try {
  kv = require('@vercel/kv').kv
} catch (error) {
  // Mock KV for build time
  kv = {
    smembers: () => Promise.resolve([]),
    sadd: () => Promise.resolve(0),
    srem: () => Promise.resolve(0),
    keys: () => Promise.resolve([]),
    hgetall: () => Promise.resolve(null),
    del: () => Promise.resolve(0),
    get: () => Promise.resolve(null),
    set: () => Promise.resolve('OK'),
    ttl: () => Promise.resolve(-1),
    zrange: () => Promise.resolve([]),
    mget: () => Promise.resolve([]),
    hset: () => Promise.resolve(0),
    zadd: () => Promise.resolve(0),
    zrem: () => Promise.resolve(0),
    lrange: () => Promise.resolve([]),
    lpush: () => Promise.resolve(0),
    lrem: () => Promise.resolve(0),
    exists: () => Promise.resolve(0),
    incr: () => Promise.resolve(1),
    expire: () => Promise.resolve(1),
  }
}
import type {
  User,
  SafeUser,
  Subscription,
  PasswordReset,
  CryptoAsset,
  NotificationLog,
  EmailDeliveryLog,
  UnsubscribeToken,
} from '@/types'

export class KV {
  // Redis methods for admin API compatibility
  static smembers = kv.smembers.bind(kv)
  static sadd = kv.sadd.bind(kv)
  static srem = kv.srem.bind(kv)
  static keys = kv.keys.bind(kv)
  static hgetall = kv.hgetall.bind(kv)
  static del = kv.del.bind(kv)
  static get = kv.get.bind(kv)
  static set = kv.set.bind(kv)
  static ttl = kv.ttl.bind(kv)
  static zrange = kv.zrange.bind(kv)
  static mget = kv.mget.bind(kv)
  // User operations
  static async createUser(user: User): Promise<void> {
    await Promise.all([
      kv.hset(`user:${user.id}`, user as unknown as Record<string, unknown>),
      kv.set(`user:email:${user.email}`, user.id),
      kv.sadd('users:all', user.id),
    ])
  }

  static async getUserById(id: string): Promise<User | null> {
    return (await kv.hgetall(`user:${id}`)) as User | null
  }

  static async getUser(id: string): Promise<User | null> {
    return this.getUserById(id)
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const id = await kv.get(`user:email:${email}`)
    return id ? await this.getUserById(id as string) : null
  }

  static async updateUser(
    userOrId: User | string,
    updates?: Partial<User>
  ): Promise<void> {
    if (typeof userOrId === 'string') {
      // Legacy support: updateUser(id, updates)
      await kv.hset(
        `user:${userOrId}`,
        updates as unknown as Record<string, unknown>
      )
    } else {
      // New support: updateUser(user)
      const user = userOrId
      await kv.hset(
        `user:${user.id}`,
        user as unknown as Record<string, unknown>
      )
    }
  }

  static async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id)
    if (!user) return

    await Promise.all([
      kv.del(`user:${id}`),
      kv.del(`user:email:${user.email}`),
      kv.srem('users:all', id),
    ])
  }

  static async getAllUsers(): Promise<User[]> {
    const userIds = await kv.smembers('users:all')
    const users = await Promise.all(
      userIds.map((id) => this.getUserById(id as string))
    )
    return users.filter((user): user is User => Boolean(user))
  }

  static async getAllSafeUsers(): Promise<SafeUser[]> {
    const users = await this.getAllUsers()
    return users.map(({ passwordHash: _, ...user }) => user as SafeUser)
  }

  // Session operations
  static async createSession(
    sessionId: string,
    userId: string,
    _expiresAt: Date
  ): Promise<void> {
    await kv.setex(`session:${sessionId}`, 86400 * 7, userId) // 7 days
  }

  static async getSession(sessionId: string): Promise<string | null> {
    return await kv.get(`session:${sessionId}`)
  }

  static async deleteSession(sessionId: string): Promise<void> {
    await kv.del(`session:${sessionId}`)
  }

  // Subscription operations
  static async createSubscription(subscription: Subscription): Promise<void> {
    const tasks = [
      kv.hset(
        `subscription:${subscription.id}`,
        subscription as unknown as Record<string, unknown>
      ),
      // Add to status-specific set for admin tracking
      kv.sadd(`subscriptions:${subscription.status}`, subscription.id)
    ]

    // Only set as user's current subscription if it's active
    if (subscription.status === 'active') {
      tasks.push(kv.set(`user:subscription:${subscription.userId}`, subscription.id))
    }

    await Promise.all(tasks)
  }

  static async getSubscriptionById(id: string): Promise<Subscription | null> {
    const data = await kv.hgetall(`subscription:${id}`)
    if (!data) return null
    
    // Convert numeric fields from strings (Redis stores everything as strings)
    return {
      ...data,
      amount: parseFloat(data.amount as string) || 0
    } as Subscription
  }

  static async getUserSubscription(
    userId: string
  ): Promise<Subscription | null> {
    const id = await kv.get(`user:subscription:${userId}`)
    return id ? await this.getSubscriptionById(id as string) : null
  }


  // Password reset operations
  static async createPasswordReset(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<void> {
    const reset: PasswordReset = {
      id: token,
      userId,
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    }

    await Promise.all([
      kv.hset(
        `password_reset:${token}`,
        reset as unknown as Record<string, unknown>
      ),
      kv.expire(`password_reset:${token}`, 86400), // 24 hours
    ])
  }

  static async getPasswordReset(token: string): Promise<PasswordReset | null> {
    return (await kv.hgetall(`password_reset:${token}`)) as PasswordReset | null
  }

  static async deletePasswordReset(token: string): Promise<void> {
    await kv.del(`password_reset:${token}`)
  }

  // Crypto operations
  static async setCryptoCache(data: CryptoAsset[], ttl: number): Promise<void> {
    await kv.setex('crypto:top100', ttl, JSON.stringify(data))
  }

  static async getCryptoCache(): Promise<CryptoAsset[] | null> {
    try {
      const cached = await kv.get('crypto:top100')
      if (!cached) return null
      
      // If it's already an object/array, return it
      if (typeof cached === 'object') {
        return cached as CryptoAsset[]
      }
      
      // If it's a string, parse it
      if (typeof cached === 'string') {
        return JSON.parse(cached)
      }
      
      return null
    } catch (error) {
      console.error('Error getting crypto cache:', error)
      return null
    }
  }

  static async getCrypto(id: string): Promise<CryptoAsset | null> {
    return (await kv.hgetall(`crypto:${id}`)) as CryptoAsset | null
  }

  static async updateCrypto(id: string, data: CryptoAsset): Promise<void> {
    await kv.hset(`crypto:${id}`, data as unknown as Record<string, unknown>)
  }

  static async getAllCryptos(): Promise<CryptoAsset[]> {
    const cached = await this.getCryptoCache()
    return cached || []
  }

  static async clearCryptoCache(): Promise<void> {
    await kv.del('crypto:top100')
  }

  // Notification operations
  static async saveNotificationLog(
    notification: NotificationLog
  ): Promise<void> {
    await Promise.all([
      kv.hset(
        `notification:${notification.id}`,
        notification as unknown as Record<string, unknown>
      ),
      kv.zadd('notifications:timeline', {
        score: Date.now(),
        member: notification.id,
      }),
    ])
  }

  static async getNotificationsSince(
    since: string
  ): Promise<NotificationLog[]> {
    const timestamp = new Date(since).getTime()
    const notificationIds = await kv.zrange(
      'notifications:timeline',
      timestamp,
      '+inf',
      { byScore: true }
    )

    if (!notificationIds.length) return []

    const notifications = await Promise.all(
      notificationIds.map((id) => kv.hgetall(`notification:${id}`))
    )

    return notifications.filter(Boolean) as unknown as NotificationLog[]
  }

  static async updateNotificationRecipientCount(
    notificationId: string,
    recipientCount: number
  ): Promise<void> {
    await kv.hset(`notification:${notificationId}`, { recipientCount })
  }

  static async saveUserNotificationLog(
    userId: string,
    logEntry: {
      userId: string
      notificationId: string
      cryptoId: string
      sentAt: string
    }
  ): Promise<void> {
    await kv.zadd(`user:${userId}:notifications`, {
      score: Date.now(),
      member: JSON.stringify(logEntry),
    })
  }


  static async getUserNotificationHistory(
    userId: string,
    limit: number = 50
  ): Promise<NotificationLog[]> {
    const entries = await kv.zrange(
      `user:${userId}:notifications`,
      0,
      limit - 1,
      { rev: true }
    )

    if (!entries.length) return []

    const notificationIds = entries
      .map((entry) => {
        try {
          return JSON.parse(entry as string).notificationId
        } catch {
          return null
        }
      })
      .filter(Boolean)

    const notifications = await Promise.all(
      notificationIds.map((id) => kv.hgetall(`notification:${id}`))
    )

    return notifications.filter(Boolean) as unknown as NotificationLog[]
  }

  static async deleteNotificationsBefore(cutoff: string): Promise<number> {
    const timestamp = new Date(cutoff).getTime()
    const notificationIds = await kv.zrange(
      'notifications:timeline',
      '-inf',
      timestamp,
      { byScore: true }
    )

    if (!notificationIds.length) return 0

    // Delete notifications
    await Promise.all(notificationIds.map((id) => kv.del(`notification:${id}`)))

    // Remove from timeline
    await kv.zremrangebyscore('notifications:timeline', 0, timestamp)

    return notificationIds.length
  }

  static async getLastNotificationForCrypto(
    cryptoId: string
  ): Promise<NotificationLog | null> {
    return (await kv.hgetall(
      `crypto:${cryptoId}:last_notification`
    )) as NotificationLog | null
  }

  static async setLastNotificationForCrypto(
    cryptoId: string,
    sentAt: string
  ): Promise<void> {
    await kv.hset(`crypto:${cryptoId}:last_notification`, { sentAt })
  }

  // Email delivery tracking operations
  static async saveEmailDeliveryLog(log: EmailDeliveryLog): Promise<void> {
    // Filter out null/undefined values to prevent Redis errors
    const cleanLog = Object.fromEntries(
      Object.entries(log).filter(([_, value]) => value !== null && value !== undefined)
    )
    
    await Promise.all([
      kv.hset(`email:${log.id}`, cleanLog as Record<string, unknown>),
      kv.zadd(`user:${log.userId}:emails`, {
        score: Date.now(),
        member: log.id,
      }),
      kv.zadd('emails:all', {
        score: Date.now(),
        member: log.id,
      }),
    ])
  }

  static async getEmailDeliveryLog(
    id: string
  ): Promise<EmailDeliveryLog | null> {
    return (await kv.hgetall(`email:${id}`)) as EmailDeliveryLog | null
  }

  static async updateEmailDeliveryStatus(
    id: string,
    status: EmailDeliveryLog['status'],
    deliveredAt?: string,
    errorMessage?: string
  ): Promise<void> {
    const updates: Partial<EmailDeliveryLog> = { status }
    if (deliveredAt) updates.deliveredAt = deliveredAt
    if (errorMessage) updates.errorMessage = errorMessage

    // Filter out null/undefined values to prevent Redis errors
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== null && value !== undefined)
    )

    await kv.hset(`email:${id}`, cleanUpdates as Record<string, unknown>)
  }

  static async getUserEmailHistory(
    userId: string,
    limit: number = 50
  ): Promise<EmailDeliveryLog[]> {
    const emailIds = await kv.zrange(`user:${userId}:emails`, 0, limit - 1, {
      rev: true,
    })

    if (!emailIds.length) return []

    const emails = await Promise.all(
      emailIds.map((id) => kv.hgetall(`email:${id}`))
    )

    return emails.filter(Boolean) as unknown as EmailDeliveryLog[]
  }

  // Unsubscribe token operations
  static async createUnsubscribeToken(token: UnsubscribeToken): Promise<void> {
    await Promise.all([
      kv.hset(
        `unsubscribe:${token.token}`,
        token as unknown as Record<string, unknown>
      ),
      kv.expire(`unsubscribe:${token.token}`, 86400 * 365), // 1 year
      kv.set(`user:${token.userId}:unsubscribe_token`, token.token),
    ])
  }

  static async getUnsubscribeToken(
    token: string
  ): Promise<UnsubscribeToken | null> {
    return (await kv.hgetall(`unsubscribe:${token}`)) as UnsubscribeToken | null
  }

  static async getUserUnsubscribeToken(userId: string): Promise<string | null> {
    return await kv.get(`user:${userId}:unsubscribe_token`)
  }

  static async deleteUnsubscribeToken(token: string): Promise<void> {
    const tokenData = await this.getUnsubscribeToken(token)
    if (tokenData) {
      await Promise.all([
        kv.del(`unsubscribe:${token}`),
        kv.del(`user:${tokenData.userId}:unsubscribe_token`),
      ])
    }
  }

  // Admin functions for subscription management
  static async getPendingSubscriptions(): Promise<Subscription[]> {
    const subscriptionIds = await kv.smembers('subscriptions:pending')
    const subscriptions = await Promise.all(
      subscriptionIds.map(async (id) => {
        const subscription = await this.getSubscriptionById(id)
        return subscription
      })
    )
    
    return subscriptions.filter(Boolean) as Subscription[]
  }

  static async getUserPendingSubscriptions(userId: string): Promise<Subscription[]> {
    const pendingSubscriptions = await this.getPendingSubscriptions()
    return pendingSubscriptions.filter(sub => sub.userId === userId)
  }

  static async getUserSubscriptionHistory(userId: string): Promise<Subscription[]> {
    try {
      // Get all subscription sets
      const activeIds = await kv.smembers('subscriptions:active')
      const pendingIds = await kv.smembers('subscriptions:pending')
      const expiredIds = await kv.smembers('subscriptions:expired')
      const blockedIds = await kv.smembers('subscriptions:blocked')
      
      // Combine all subscription IDs
      const allSubscriptionIds = [...activeIds, ...pendingIds, ...expiredIds, ...blockedIds]
      
      // Get all subscriptions and filter by userId
      const subscriptions = await Promise.all(
        allSubscriptionIds.map(async (id) => {
          const subscription = await this.getSubscriptionById(id)
          return subscription
        })
      )
      
      // Filter by userId and remove null values
      const userSubscriptions = subscriptions
        .filter(Boolean)
        .filter((sub) => sub!.userId === userId) as Subscription[]
      
      // Sort by creation date (most recent first), fallback to startDate if createdAt is missing
      return userSubscriptions.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(a.startDate)
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(b.startDate)
        return dateB.getTime() - dateA.getTime()
      })
    } catch (error) {
      console.error('Failed to get user subscription history:', error)
      return []
    }
  }

  static async updateSubscription(
    subscriptionOrId: Subscription | string,
    updates?: Partial<Subscription>
  ): Promise<void> {
    let subscription: Subscription
    
    if (typeof subscriptionOrId === 'string') {
      // Legacy support: updateSubscription(id, updates)
      const existing = await this.getSubscriptionById(subscriptionOrId)
      if (!existing) throw new Error('Subscription not found')
      subscription = { ...existing, ...updates }
    } else {
      // New support: updateSubscription(subscription)
      subscription = subscriptionOrId
    }
    
    const oldSubscription = await this.getSubscriptionById(subscription.id)
    
    // Update the subscription data
    await kv.hset(
      `subscription:${subscription.id}`,
      subscription as unknown as Record<string, unknown>
    )

    // Update set memberships based on status changes
    if (oldSubscription && oldSubscription.status !== subscription.status) {
      console.log(`🔄 Subscription ${subscription.id} status changing: ${oldSubscription.status} → ${subscription.status}`)
      
      // Remove from old status set
      const removeResult = await kv.srem(`subscriptions:${oldSubscription.status}`, subscription.id)
      console.log(`🗑️ Removed from 'subscriptions:${oldSubscription.status}' set: ${removeResult > 0 ? 'SUCCESS' : 'NOT_FOUND'}`)
      
      // Add to new status set
      const addResult = await kv.sadd(`subscriptions:${subscription.status}`, subscription.id)
      console.log(`➕ Added to 'subscriptions:${subscription.status}' set: ${addResult > 0 ? 'SUCCESS' : 'ALREADY_EXISTS'}`)
      
      // Update user's current subscription
      if (subscription.status === 'active') {
        await kv.set(`user:subscription:${subscription.userId}`, subscription.id)
        console.log(`🔗 Set active subscription for user ${subscription.userId}: ${subscription.id}`)
      } else if (oldSubscription.status === 'active') {
        await kv.del(`user:subscription:${subscription.userId}`)
        console.log(`🗑️ Removed active subscription for user ${subscription.userId}`)
      }
      
      console.log(`✅ Subscription ${subscription.id} Redis set membership updated successfully`)
    } else if (!oldSubscription) {
      // New subscription - add to appropriate set
      console.log(`🆕 Adding new subscription ${subscription.id} to 'subscriptions:${subscription.status}' set`)
      const addResult = await kv.sadd(`subscriptions:${subscription.status}`, subscription.id)
      console.log(`➕ Added to 'subscriptions:${subscription.status}' set: ${addResult > 0 ? 'SUCCESS' : 'ALREADY_EXISTS'}`)
      
      if (subscription.status === 'active') {
        await kv.set(`user:subscription:${subscription.userId}`, subscription.id)
        console.log(`🔗 Set active subscription for user ${subscription.userId}: ${subscription.id}`)
      }
    }
  }
}
