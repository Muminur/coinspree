import { SubscriptionService } from '@/lib/subscription'
import { mockKV } from '../../../tests/mocks/kv.mock'
import { testUsers, testSubscriptions, createTestUser, createTestSubscription, createExpiredSubscription } from '../../../tests/fixtures/users'
import type { Subscription } from '@/types'

describe('Subscription Service', () => {
  beforeEach(() => {
    mockKV.clear()
    jest.clearAllMocks()
  })

  describe('createSubscription', () => {
    it('should create a new subscription successfully', async () => {
      const userId = 'test-user-id'
      const paymentTxHash = 'test-tx-hash'
      const amount = 30
      
      const result = await SubscriptionService.createSubscription(userId, paymentTxHash, amount)
      
      expect(result.success).toBe(true)
      expect(result.subscription).toBeDefined()
      expect(result.subscription?.userId).toBe(userId)
      expect(result.subscription?.paymentTxHash).toBe(paymentTxHash)
      expect(result.subscription?.amount).toBe(amount)
      expect(result.subscription?.status).toBe('pending') // New subscriptions start as pending
    })

    it('should calculate correct end date for monthly subscription', async () => {
      const userId = 'test-user-id'
      const amount = 3 // Monthly subscription
      
      const result = await SubscriptionService.createSubscription(userId, 'tx-hash', amount)
      
      expect(result.success).toBe(true)
      
      const startDate = new Date(result.subscription!.startDate)
      const endDate = new Date(result.subscription!.endDate)
      const diffInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      expect(diffInDays).toBe(30) // 30 days for monthly
    })

    it('should calculate correct end date for yearly subscription', async () => {
      const userId = 'test-user-id'
      const amount = 30 // Yearly subscription
      
      const result = await SubscriptionService.createSubscription(userId, 'tx-hash', amount)
      
      expect(result.success).toBe(true)
      
      const startDate = new Date(result.subscription!.startDate)
      const endDate = new Date(result.subscription!.endDate)
      const diffInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      expect(diffInDays).toBe(365) // 365 days for yearly
    })

    it('should extend existing active subscription', async () => {
      const userId = 'test-user-id'
      const existingSubscription = createTestSubscription(userId, {
        status: 'active',
        endDate: '2024-06-01T00:00:00.000Z',
      })
      
      await mockKV.set(`user:subscription:${userId}`, existingSubscription)
      
      const result = await SubscriptionService.createSubscription(userId, 'new-tx-hash', 30)
      
      expect(result.success).toBe(true)
      
      const newEndDate = new Date(result.subscription!.endDate)
      const originalEndDate = new Date('2024-06-01T00:00:00.000Z')
      
      // Should extend from original end date, not current date
      expect(newEndDate > originalEndDate).toBe(true)
    })

    it('should handle invalid amount', async () => {
      const result = await SubscriptionService.createSubscription('user-id', 'tx-hash', 5)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid subscription amount')
    })
  })

  describe('getSubscriptionStatus', () => {
    it('should return active status for valid subscription', async () => {
      const userId = 'test-user-id'
      const activeSubscription = createTestSubscription(userId, {
        status: 'active',
        endDate: '2025-12-31T23:59:59.999Z', // Future date
      })
      
      await mockKV.set(`user:subscription:${userId}`, activeSubscription)
      
      const result = await SubscriptionService.getSubscriptionStatus(userId)
      
      expect(result.success).toBe(true)
      expect(result.status).toBe('active')
      expect(result.subscription).toEqual(activeSubscription)
    })

    it('should return expired status for past end date', async () => {
      const userId = 'test-user-id'
      const expiredSubscription = createExpiredSubscription(userId)
      
      await mockKV.set(`user:subscription:${userId}`, expiredSubscription)
      
      const result = await SubscriptionService.getSubscriptionStatus(userId)
      
      expect(result.success).toBe(true)
      expect(result.status).toBe('expired')
    })

    it('should return none for user without subscription', async () => {
      const result = await SubscriptionService.getSubscriptionStatus('non-existent-user')
      
      expect(result.success).toBe(true)
      expect(result.status).toBe('none')
      expect(result.subscription).toBeNull()
    })

    it('should return blocked status for blocked subscription', async () => {
      const userId = 'test-user-id'
      const blockedSubscription = createTestSubscription(userId, {
        status: 'blocked',
      })
      
      await mockKV.set(`user:subscription:${userId}`, blockedSubscription)
      
      const result = await SubscriptionService.getSubscriptionStatus(userId)
      
      expect(result.success).toBe(true)
      expect(result.status).toBe('blocked')
    })
  })

  describe('updateSubscriptionStatus', () => {
    it('should update subscription status successfully', async () => {
      const subscription = createTestSubscription('user-id', { status: 'pending' })
      await mockKV.set(`subscription:${subscription.id}`, subscription)
      await mockKV.set(`user:subscription:${subscription.userId}`, subscription)
      
      const result = await SubscriptionService.updateSubscriptionStatus(subscription.id, 'active')
      
      expect(result.success).toBe(true)
      
      // Verify subscription was updated
      const updated = await mockKV.get(`subscription:${subscription.id}`)
      expect(updated.status).toBe('active')
    })

    it('should fail for non-existent subscription', async () => {
      const result = await SubscriptionService.updateSubscriptionStatus('non-existent', 'active')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Subscription not found')
    })
  })

  describe('verifyPayment', () => {
    it('should verify valid USDT payment', async () => {
      const txHash = 'valid-tx-hash'
      const expectedAmount = 30
      
      // Mock successful payment verification
      jest.spyOn(SubscriptionService, 'verifyTronPayment').mockResolvedValue({
        success: true,
        amount: expectedAmount,
        verified: true,
      })
      
      const result = await SubscriptionService.verifyPayment(txHash, expectedAmount)
      
      expect(result.success).toBe(true)
      expect(result.verified).toBe(true)
      expect(result.amount).toBe(expectedAmount)
    })

    it('should reject payment with incorrect amount', async () => {
      const txHash = 'invalid-amount-tx'
      const expectedAmount = 30
      const actualAmount = 25
      
      jest.spyOn(SubscriptionService, 'verifyTronPayment').mockResolvedValue({
        success: true,
        amount: actualAmount,
        verified: false,
      })
      
      const result = await SubscriptionService.verifyPayment(txHash, expectedAmount)
      
      expect(result.success).toBe(true)
      expect(result.verified).toBe(false)
      expect(result.amount).toBe(actualAmount)
    })

    it('should handle blockchain verification errors', async () => {
      const txHash = 'error-tx-hash'
      
      jest.spyOn(SubscriptionService, 'verifyTronPayment').mockResolvedValue({
        success: false,
        error: 'Transaction not found',
      })
      
      const result = await SubscriptionService.verifyPayment(txHash, 30)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Transaction not found')
    })

    it('should accept payments within tolerance range', async () => {
      const txHash = 'tolerance-tx-hash'
      const expectedAmount = 30
      const actualAmount = 29.7 // Within 1% tolerance
      
      jest.spyOn(SubscriptionService, 'verifyTronPayment').mockResolvedValue({
        success: true,
        amount: actualAmount,
        verified: true, // Should be true within tolerance
      })
      
      const result = await SubscriptionService.verifyPayment(txHash, expectedAmount)
      
      expect(result.success).toBe(true)
      expect(result.verified).toBe(true)
    })
  })

  describe('getSubscriptionHistory', () => {
    it('should return subscription history for user', async () => {
      const userId = 'test-user-id'
      const subscriptions = [
        createTestSubscription(userId, { status: 'active' }),
        createTestSubscription(userId, { status: 'expired' }),
      ]
      
      // Mock the KV operations for subscription history
      jest.spyOn(mockKV, 'smembers').mockResolvedValue(['sub-1', 'sub-2'])
      jest.spyOn(mockKV, 'get').mockImplementation(async (key) => {
        if (key === 'subscription:sub-1') return subscriptions[0]
        if (key === 'subscription:sub-2') return subscriptions[1]
        return null
      })
      
      const result = await SubscriptionService.getSubscriptionHistory(userId)
      
      expect(result.success).toBe(true)
      expect(result.subscriptions).toHaveLength(2)
    })

    it('should return empty history for user without subscriptions', async () => {
      jest.spyOn(mockKV, 'smembers').mockResolvedValue([])
      
      const result = await SubscriptionService.getSubscriptionHistory('new-user')
      
      expect(result.success).toBe(true)
      expect(result.subscriptions).toHaveLength(0)
    })
  })

  describe('getExpiringSubscriptions', () => {
    it('should return subscriptions expiring in specified days', async () => {
      const daysBeforeExpiry = 7
      const expiringDate = new Date()
      expiringDate.setDate(expiringDate.getDate() + daysBeforeExpiry)
      
      const expiringSubscription = createTestSubscription('user-1', {
        status: 'active',
        endDate: expiringDate.toISOString(),
      })
      
      const nonExpiringSubscription = createTestSubscription('user-2', {
        status: 'active',
        endDate: '2025-12-31T23:59:59.999Z',
      })
      
      // Mock getAllUsers and getUserSubscription
      jest.spyOn(mockKV, 'smembers').mockResolvedValue(['user-1', 'user-2'])
      jest.spyOn(mockKV, 'get').mockImplementation(async (key) => {
        if (key === 'user:user-1') return createTestUser({ id: 'user-1' })
        if (key === 'user:user-2') return createTestUser({ id: 'user-2' })
        if (key === 'user:subscription:user-1') return expiringSubscription
        if (key === 'user:subscription:user-2') return nonExpiringSubscription
        return null
      })
      
      const result = await SubscriptionService.getExpiringSubscriptions(daysBeforeExpiry)
      
      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('user-1')
    })
  })

  describe('calculateSubscriptionDuration', () => {
    it('should return 30 days for monthly subscription', () => {
      const duration = SubscriptionService.calculateSubscriptionDuration(3)
      expect(duration).toBe(30)
    })

    it('should return 365 days for yearly subscription', () => {
      const duration = SubscriptionService.calculateSubscriptionDuration(30)
      expect(duration).toBe(365)
    })

    it('should throw error for invalid amount', () => {
      expect(() => SubscriptionService.calculateSubscriptionDuration(5)).toThrow('Invalid subscription amount')
    })
  })
})