import { sendATHNotificationEmail, sendWelcomeEmail, sendTestNotificationEmail, emailQueue } from '@/lib/email'
import { NotificationService } from '@/lib/notifications'
import { mockKV } from '../../../tests/mocks/kv.mock'
import { testUsers, createTestUser } from '../../../tests/fixtures/users'
import { mockCryptoData } from '../../../tests/mocks/coingecko.mock'
import type { ATHNotificationData } from '@/types'

// Mock Resend
const mockSend = jest.fn()
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}))

// Mock Edge Config
jest.mock('@vercel/edge-config', () => ({
  get: jest.fn().mockImplementation((key: string) => {
    // Return mock email templates
    if (key === 'email-template-ath-notification') {
      return {
        subject: '🚀 {{cryptoName}} ({{symbol}}) Hit New All-Time High!',
        html: '<h1>{{cryptoName}} reached {{newATH}}</h1>',
        text: '{{cryptoName}} reached {{newATH}}',
      }
    }
    if (key === 'email-template-welcome') {
      return {
        subject: 'Welcome to CoinSpree!',
        html: '<h1>Welcome {{email}}!</h1>',
        text: 'Welcome {{email}}!',
      }
    }
    return null
  }),
}))

describe('Email Service', () => {
  beforeEach(() => {
    mockKV.clear()
    jest.clearAllMocks()
    mockSend.mockClear()
    
    // Set up environment variables
    process.env.RESEND_API_KEY = 'test-resend-key'
    process.env.EMAIL_FROM = 'CoinSpree <notifications@urgent.coinspree.cc>'
    process.env.EMAIL_REPLY_TO = 'support@urgent.coinspree.cc'
  })

  describe('sendATHNotificationEmail', () => {
    const mockATHData: ATHNotificationData = {
      cryptoName: 'Bitcoin',
      symbol: 'BTC',
      newATH: 70000,
      previousATH: 69000,
      percentageIncrease: 1.45,
      athDate: '2024-01-01T00:00:00.000Z',
    }

    it('should send ATH notification email successfully', async () => {
      const user = createTestUser()
      const activeSubscription = {
        id: 'sub-1',
        userId: user.id,
        status: 'active' as const,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2025-01-01T00:00:00.000Z',
        paymentTxHash: 'tx-hash',
        amount: 30,
      }
      
      await mockKV.set(`user:subscription:${user.id}`, activeSubscription)
      
      mockSend.mockResolvedValue({ data: { id: 'email-123' } })
      
      const result = await sendATHNotificationEmail(user, mockATHData)
      
      expect(result.success).toBe(true)
      expect(result.emailId).toBeDefined()
      expect(mockSend).toHaveBeenCalledWith({
        from: expect.stringContaining('notifications@urgent.coinspree.cc'),
        to: user.email,
        subject: expect.stringContaining('Bitcoin (BTC) Hit New All-Time High'),
        html: expect.stringContaining('Bitcoin reached $70,000'),
        text: expect.stringContaining('Bitcoin reached $70,000'),
        reply_to: expect.stringContaining('support@urgent.coinspree.cc'),
        tags: expect.arrayContaining([
          { name: 'type', value: 'ath-notification' },
          { name: 'crypto', value: 'BTC' },
        ]),
      })
    })

    it('should block ATH notifications for admin users', async () => {
      const adminUser = { ...testUsers.adminUser }
      
      const result = await sendATHNotificationEmail(adminUser, mockATHData)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Admin users cannot receive ATH notifications')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should block notifications for users without active subscription', async () => {
      const user = createTestUser()
      // No subscription set up
      
      const result = await sendATHNotificationEmail(user, mockATHData)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Active subscription required')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should block notifications for users with expired subscription', async () => {
      const user = createTestUser()
      const expiredSubscription = {
        id: 'sub-1',
        userId: user.id,
        status: 'active' as const,
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: '2023-12-31T23:59:59.999Z', // Expired
        paymentTxHash: 'tx-hash',
        amount: 30,
      }
      
      await mockKV.set(`user:subscription:${user.id}`, expiredSubscription)
      
      const result = await sendATHNotificationEmail(user, mockATHData)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Subscription expired')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should block notifications for users with notifications disabled', async () => {
      const user = createTestUser({ notificationsEnabled: false })
      
      const result = await sendATHNotificationEmail(user, mockATHData)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('notifications disabled')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should handle email sending errors gracefully', async () => {
      const user = createTestUser()
      const activeSubscription = {
        id: 'sub-1',
        userId: user.id,
        status: 'active' as const,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2025-01-01T00:00:00.000Z',
        paymentTxHash: 'tx-hash',
        amount: 30,
      }
      
      await mockKV.set(`user:subscription:${user.id}`, activeSubscription)
      
      mockSend.mockResolvedValue({ error: { message: 'Email sending failed' } })
      
      const result = await sendATHNotificationEmail(user, mockATHData)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Email sending failed')
    })

    it('should properly format currency and percentage values', async () => {
      const user = createTestUser()
      const activeSubscription = {
        id: 'sub-1',
        userId: user.id,
        status: 'active' as const,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2025-01-01T00:00:00.000Z',
        paymentTxHash: 'tx-hash',
        amount: 30,
      }
      
      await mockKV.set(`user:subscription:${user.id}`, activeSubscription)
      
      mockSend.mockResolvedValue({ data: { id: 'email-123' } })
      
      const athData: ATHNotificationData = {
        cryptoName: 'Bitcoin',
        symbol: 'BTC',
        newATH: 70123.456789,
        previousATH: 69000.123456,
        percentageIncrease: 1.62543,
        athDate: '2024-01-01T00:00:00.000Z',
      }
      
      await sendATHNotificationEmail(user, athData)
      
      const emailCall = mockSend.mock.calls[0][0]
      expect(emailCall.subject).toContain('Bitcoin (BTC)')
      expect(emailCall.html).toContain('$70,123') // Formatted currency
      expect(emailCall.text).toContain('$70,123')
    })
  })

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      const user = createTestUser()
      
      mockSend.mockResolvedValue({ data: { id: 'email-456' } })
      
      const result = await sendWelcomeEmail(user)
      
      expect(result.success).toBe(true)
      expect(result.emailId).toBeDefined()
      expect(mockSend).toHaveBeenCalledWith({
        from: expect.stringContaining('notifications@urgent.coinspree.cc'),
        to: user.email,
        subject: 'Welcome to CoinSpree!',
        html: expect.stringContaining(`Welcome ${user.email}!`),
        text: expect.stringContaining(`Welcome ${user.email}!`),
        reply_to: expect.stringContaining('support@urgent.coinspree.cc'),
        tags: [{ name: 'type', value: 'welcome' }],
      })
    })

    it('should handle welcome email errors', async () => {
      const user = createTestUser()
      
      mockSend.mockResolvedValue({ error: { message: 'Welcome email failed' } })
      
      const result = await sendWelcomeEmail(user)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Welcome email failed')
    })
  })

  describe('sendTestNotificationEmail', () => {
    it('should send test notification successfully for subscribed user', async () => {
      const user = createTestUser()
      const activeSubscription = {
        id: 'sub-1',
        userId: user.id,
        status: 'active' as const,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2025-01-01T00:00:00.000Z',
        paymentTxHash: 'tx-hash',
        amount: 30,
      }
      
      await mockKV.set(`user:subscription:${user.id}`, activeSubscription)
      
      mockSend.mockResolvedValue({ data: { id: 'test-email-123' } })
      
      const result = await sendTestNotificationEmail(user)
      
      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: user.email,
        subject: expect.stringContaining('Bitcoin (BTC) Hit New All-Time High'),
      }))
    })

    it('should use test data for test notifications', async () => {
      const user = createTestUser()
      const activeSubscription = {
        id: 'sub-1',
        userId: user.id,
        status: 'active' as const,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2025-01-01T00:00:00.000Z',
        paymentTxHash: 'tx-hash',
        amount: 30,
      }
      
      await mockKV.set(`user:subscription:${user.id}`, activeSubscription)
      
      mockSend.mockResolvedValue({ data: { id: 'test-email-123' } })
      
      await sendTestNotificationEmail(user)
      
      const emailCall = mockSend.mock.calls[0][0]
      expect(emailCall.html).toContain('Bitcoin')
      expect(emailCall.html).toContain('$50,000') // Test ATH value
    })
  })

  describe('EmailQueue', () => {
    beforeEach(() => {
      emailQueue.clearQueue()
    })

    it('should queue ATH notifications for processing', async () => {
      const user = createTestUser()
      const athData = mockATHData
      
      mockSend.mockResolvedValue({ data: { id: 'queued-email-123' } })
      
      await emailQueue.addATHNotification(user, athData)
      
      // Allow some time for queue processing
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockSend).toHaveBeenCalled()
    })

    it('should provide queue status', () => {
      const status = emailQueue.getQueueStatus()
      
      expect(status).toMatchObject({
        pending: expect.any(Number),
        processing: expect.any(Boolean),
      })
    })

    it('should clear queue when requested', () => {
      // Add some items to queue first
      const user = createTestUser()
      emailQueue.addATHNotification(user, mockATHData)
      
      const clearedCount = emailQueue.clearQueue()
      const status = emailQueue.getQueueStatus()
      
      expect(clearedCount).toBeGreaterThanOrEqual(0)
      expect(status.pending).toBe(0)
    })
  })

  describe('NotificationService.getEligibleUsers', () => {
    it('should return only users with active subscriptions and notifications enabled', async () => {
      // Set up test users
      const userWithSubscription = createTestUser({ id: 'user-1', notificationsEnabled: true })
      const userWithoutSubscription = createTestUser({ id: 'user-2', notificationsEnabled: true })
      const userWithDisabledNotifications = createTestUser({ id: 'user-3', notificationsEnabled: false })
      const adminUser = createTestUser({ id: 'admin-1', role: 'admin', notificationsEnabled: true })
      
      // Set up subscriptions
      const activeSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        status: 'active' as const,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2025-01-01T00:00:00.000Z',
        paymentTxHash: 'tx-hash-1',
        amount: 30,
      }
      
      // Mock KV operations
      await mockKV.set('user:user-1', userWithSubscription)
      await mockKV.set('user:user-2', userWithoutSubscription)
      await mockKV.set('user:user-3', userWithDisabledNotifications)
      await mockKV.set('user:admin-1', adminUser)
      await mockKV.set('user:subscription:user-1', activeSubscription)
      await mockKV.sadd('users:all', 'user-1')
      await mockKV.sadd('users:all', 'user-2')
      await mockKV.sadd('users:all', 'user-3')
      await mockKV.sadd('users:all', 'admin-1')
      
      // Test the private method through sendATHNotifications
      const result = await NotificationService.sendATHNotifications(
        mockCryptoData[0],
        69000,
        {
          id: 'notif-1',
          cryptoId: 'bitcoin',
          newATH: 70000,
          previousATH: 69000,
          sentAt: new Date().toISOString(),
          recipientCount: 0,
        }
      )
      
      expect(result.success).toBe(true)
      expect(result.recipientCount).toBe(1) // Only user-1 should be eligible
    })
  })

  describe('Template Processing', () => {
    it('should replace template variables correctly', async () => {
      const user = createTestUser()
      const activeSubscription = {
        id: 'sub-1',
        userId: user.id,
        status: 'active' as const,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2025-01-01T00:00:00.000Z',
        paymentTxHash: 'tx-hash',
        amount: 30,
      }
      
      await mockKV.set(`user:subscription:${user.id}`, activeSubscription)
      
      mockSend.mockResolvedValue({ data: { id: 'template-test-123' } })
      
      const athData: ATHNotificationData = {
        cryptoName: 'Ethereum',
        symbol: 'ETH',
        newATH: 5000,
        previousATH: 4800,
        percentageIncrease: 4.17,
        athDate: '2024-01-01T12:00:00.000Z',
      }
      
      await sendATHNotificationEmail(user, athData)
      
      const emailCall = mockSend.mock.calls[0][0]
      expect(emailCall.subject).toContain('Ethereum (ETH)')
      expect(emailCall.html).toContain('Ethereum reached $5,000')
      expect(emailCall.html).not.toContain('{{cryptoName}}') // Variables should be replaced
      expect(emailCall.html).not.toContain('{{newATH}}')
    })
  })
})