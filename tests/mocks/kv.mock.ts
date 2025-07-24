// Mock implementation of Vercel KV for testing
import type { User, Subscription, CryptoAsset, NotificationLog } from '@/types'

class MockKV {
  private store: Map<string, any> = new Map()
  private sets: Map<string, Set<string>> = new Map()

  // Basic Redis operations
  async get(key: string): Promise<any> {
    return this.store.get(key) || null
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
    this.store.set(key, value)
    if (options?.ex) {
      setTimeout(() => this.store.delete(key), options.ex * 1000)
    }
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0
  }

  async hset(key: string, field: string, value: any): Promise<number> {
    const hash = this.store.get(key) || {}
    hash[field] = value
    this.store.set(key, hash)
    return 1
  }

  async hget(key: string, field: string): Promise<any> {
    const hash = this.store.get(key) || {}
    return hash[field] || null
  }

  async hgetall(key: string): Promise<Record<string, any>> {
    return this.store.get(key) || {}
  }

  async sadd(setKey: string, member: string): Promise<number> {
    if (!this.sets.has(setKey)) {
      this.sets.set(setKey, new Set())
    }
    const set = this.sets.get(setKey)!
    const sizeBefore = set.size
    set.add(member)
    return set.size > sizeBefore ? 1 : 0
  }

  async srem(setKey: string, member: string): Promise<number> {
    const set = this.sets.get(setKey)
    if (!set) return 0
    return set.delete(member) ? 1 : 0
  }

  async smembers(setKey: string): Promise<string[]> {
    const set = this.sets.get(setKey)
    return set ? Array.from(set) : []
  }

  async sismember(setKey: string, member: string): Promise<number> {
    const set = this.sets.get(setKey)
    return set?.has(member) ? 1 : 0
  }

  // Utility methods for testing
  clear(): void {
    this.store.clear()
    this.sets.clear()
  }

  getStore(): Map<string, any> {
    return new Map(this.store)
  }

  getSets(): Map<string, Set<string>> {
    return new Map(this.sets)
  }
}

// Create singleton instance
export const mockKV = new MockKV()

// Mock the KV module
jest.mock('@/lib/kv', () => ({
  KV: {
    // User operations
    async getUser(id: string): Promise<User | null> {
      return mockKV.get(`user:${id}`)
    },

    async getUserByEmail(email: string): Promise<User | null> {
      const userId = await mockKV.get(`user:email:${email}`)
      return userId ? mockKV.get(`user:${userId}`) : null
    },

    async createUser(user: User): Promise<void> {
      await mockKV.set(`user:${user.id}`, user)
      await mockKV.set(`user:email:${user.email}`, user.id)
      await mockKV.sadd('users:all', user.id)
    },

    async updateUser(user: User): Promise<void> {
      await mockKV.set(`user:${user.id}`, user)
    },

    async deleteUser(id: string): Promise<void> {
      const user = await mockKV.get(`user:${id}`)
      if (user) {
        await mockKV.del(`user:${id}`)
        await mockKV.del(`user:email:${user.email}`)
        await mockKV.srem('users:all', id)
      }
    },

    async getAllUsers(): Promise<User[]> {
      const userIds = await mockKV.smembers('users:all')
      const users = await Promise.all(
        userIds.map(id => mockKV.get(`user:${id}`))
      )
      return users.filter(Boolean)
    },

    // Subscription operations
    async getUserSubscription(userId: string): Promise<Subscription | null> {
      return mockKV.get(`user:subscription:${userId}`)
    },

    async createSubscription(subscription: Subscription): Promise<void> {
      await mockKV.set(`subscription:${subscription.id}`, subscription)
      await mockKV.set(`user:subscription:${subscription.userId}`, subscription)
      await mockKV.sadd(`subscriptions:${subscription.status}`, subscription.id)
    },

    async updateSubscription(subscription: Subscription): Promise<void> {
      const existing = await mockKV.get(`subscription:${subscription.id}`)
      if (existing && existing.status !== subscription.status) {
        await mockKV.srem(`subscriptions:${existing.status}`, subscription.id)
        await mockKV.sadd(`subscriptions:${subscription.status}`, subscription.id)
      }
      await mockKV.set(`subscription:${subscription.id}`, subscription)
      await mockKV.set(`user:subscription:${subscription.userId}`, subscription)
    },

    // Crypto operations
    async getCrypto(id: string): Promise<CryptoAsset | null> {
      return mockKV.get(`crypto:${id}`)
    },

    async updateCrypto(id: string, crypto: CryptoAsset): Promise<void> {
      await mockKV.set(`crypto:${id}`, crypto)
      await mockKV.sadd('crypto:top100', id)
    },

    async getCryptoCache(): Promise<CryptoAsset[] | null> {
      return mockKV.get('coingecko:top100')
    },

    async setCryptoCache(data: CryptoAsset[], ttl: number): Promise<void> {
      await mockKV.set('coingecko:top100', data, { ex: ttl })
    },

    // Notification operations
    async saveNotificationLog(log: NotificationLog): Promise<void> {
      await mockKV.set(`notification:${log.id}`, log)
      await mockKV.sadd('notifications:log', log.id)
    },

    async getNotificationsSince(cutoff: string): Promise<NotificationLog[]> {
      const logIds = await mockKV.smembers('notifications:log')
      const logs = await Promise.all(
        logIds.map(id => mockKV.get(`notification:${id}`))
      )
      return logs.filter(log => log && log.sentAt >= cutoff)
    },

    // Session operations
    async createSession(sessionId: string, userId: string): Promise<void> {
      await mockKV.set(`session:${sessionId}`, { userId, createdAt: new Date().toISOString() })
    },

    async getSession(sessionId: string): Promise<{ userId: string } | null> {
      return mockKV.get(`session:${sessionId}`)
    },

    async deleteSession(sessionId: string): Promise<void> {
      await mockKV.del(`session:${sessionId}`)
    },
  },
  mockKV,
}))

export default mockKV