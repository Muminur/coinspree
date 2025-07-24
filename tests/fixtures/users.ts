import type { User, Subscription } from '@/types'
import { StringUtils } from '@/lib/utils'

export const testUsers: Record<string, User> = {
  regularUser: {
    id: 'user-1',
    email: 'user@test.com',
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewCOyI2JhKOBq6Fm', // 'password123'
    role: 'user',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLogin: '2024-01-01T00:00:00.000Z',
    notificationsEnabled: true,
  },
  adminUser: {
    id: 'admin-1',
    email: 'admin@test.com',
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewCOyI2JhKOBq6Fm',
    role: 'admin',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLogin: '2024-01-01T00:00:00.000Z',
    notificationsEnabled: false, // Admins don't receive notifications
  },
  inactiveUser: {
    id: 'user-2',
    email: 'inactive@test.com',
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewCOyI2JhKOBq6Fm',
    role: 'user',
    isActive: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLogin: '2024-01-01T00:00:00.000Z',
    notificationsEnabled: true,
  },
  userWithoutNotifications: {
    id: 'user-3',
    email: 'nonotifs@test.com',
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewCOyI2JhKOBq6Fm',
    role: 'user',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLogin: '2024-01-01T00:00:00.000Z',
    notificationsEnabled: false,
  },
}

export const testSubscriptions: Record<string, Subscription> = {
  activeSubscription: {
    id: 'sub-1',
    userId: 'user-1',
    status: 'active',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-12-31T23:59:59.999Z',
    paymentTxHash: 'tx-hash-1',
    amount: 30,
  },
  expiredSubscription: {
    id: 'sub-2',
    userId: 'user-2',
    status: 'expired',
    startDate: '2023-01-01T00:00:00.000Z',
    endDate: '2023-12-31T23:59:59.999Z',
    paymentTxHash: 'tx-hash-2',
    amount: 30,
  },
  pendingSubscription: {
    id: 'sub-3',
    userId: 'user-3',
    status: 'pending',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-12-31T23:59:59.999Z',
    paymentTxHash: 'tx-hash-3',
    amount: 3,
  },
  blockedSubscription: {
    id: 'sub-4',
    userId: 'user-4',
    status: 'blocked',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-12-31T23:59:59.999Z',
    paymentTxHash: 'tx-hash-4',
    amount: 30,
  },
}

export const createTestUser = (overrides: Partial<User> = {}): User => ({
  ...testUsers.regularUser,
  id: StringUtils.generateId(16),
  email: `test-${Date.now()}@example.com`,
  ...overrides,
})

export const createTestSubscription = (
  userId: string,
  overrides: Partial<Subscription> = {}
): Subscription => ({
  ...testSubscriptions.activeSubscription,
  id: StringUtils.generateId(16),
  userId,
  ...overrides,
})

export const createExpiredSubscription = (userId: string): Subscription => ({
  ...testSubscriptions.activeSubscription,
  id: StringUtils.generateId(16),
  userId,
  status: 'expired',
  endDate: '2023-12-31T23:59:59.999Z',
})

export const createFutureSubscription = (userId: string): Subscription => ({
  ...testSubscriptions.activeSubscription,
  id: StringUtils.generateId(16),
  userId,
  endDate: '2025-12-31T23:59:59.999Z',
})