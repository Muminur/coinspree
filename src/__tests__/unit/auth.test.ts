import { Auth } from '@/lib/auth'
import { mockKV } from '../../../tests/mocks/kv.mock'
import { testUsers, createTestUser } from '../../../tests/fixtures/users'
import bcrypt from 'bcryptjs'

// Mock bcrypt
jest.mock('bcryptjs')
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>

describe('Auth Service', () => {
  beforeEach(() => {
    mockKV.clear()
    jest.clearAllMocks()
  })

  describe('hashPassword', () => {
    it('should hash password with correct salt rounds', async () => {
      const password = 'testPassword123'
      const hashedPassword = 'hashedPassword'
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword)
      
      const result = await Auth.hashPassword(password)
      
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 12)
      expect(result).toBe(hashedPassword)
    })

    it('should throw error if password is empty', async () => {
      await expect(Auth.hashPassword('')).rejects.toThrow('Password cannot be empty')
    })

    it('should throw error if password is too short', async () => {
      await expect(Auth.hashPassword('123')).rejects.toThrow('Password must be at least 8 characters')
    })
  })

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'testPassword123'
      const hashedPassword = 'hashedPassword'
      
      mockedBcrypt.compare.mockResolvedValue(true)
      
      const result = await Auth.verifyPassword(password, hashedPassword)
      
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword)
      expect(result).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const password = 'wrongPassword'
      const hashedPassword = 'hashedPassword'
      
      mockedBcrypt.compare.mockResolvedValue(false)
      
      const result = await Auth.verifyPassword(password, hashedPassword)
      
      expect(result).toBe(false)
    })
  })

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const email = 'newuser@test.com'
      const password = 'password123'
      const hashedPassword = 'hashedPassword'
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword)
      
      const result = await Auth.register(email, password)
      
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.email).toBe(email)
      expect(result.user?.passwordHash).toBe(hashedPassword)
      expect(result.user?.role).toBe('user')
      expect(result.user?.isActive).toBe(true)
      expect(result.user?.notificationsEnabled).toBe(true)
    })

    it('should fail if user already exists', async () => {
      // Create existing user
      await mockKV.set(`user:email:${testUsers.regularUser.email}`, testUsers.regularUser.id)
      
      const result = await Auth.register(testUsers.regularUser.email, 'password123')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('User already exists')
    })

    it('should fail with invalid email format', async () => {
      const result = await Auth.register('invalid-email', 'password123')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid email format')
    })

    it('should fail with weak password', async () => {
      const result = await Auth.register('test@example.com', '123')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Password must be at least 8 characters')
    })
  })

  describe('login', () => {
    beforeEach(async () => {
      // Set up test user
      await mockKV.set(`user:${testUsers.regularUser.id}`, testUsers.regularUser)
      await mockKV.set(`user:email:${testUsers.regularUser.email}`, testUsers.regularUser.id)
    })

    it('should successfully login with correct credentials', async () => {
      mockedBcrypt.compare.mockResolvedValue(true)
      
      const result = await Auth.login(testUsers.regularUser.email, 'password123')
      
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.id).toBe(testUsers.regularUser.id)
      expect(result.sessionId).toBeDefined()
    })

    it('should fail with incorrect password', async () => {
      mockedBcrypt.compare.mockResolvedValue(false)
      
      const result = await Auth.login(testUsers.regularUser.email, 'wrongpassword')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
    })

    it('should fail with non-existent user', async () => {
      const result = await Auth.login('nonexistent@test.com', 'password123')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
    })

    it('should fail with inactive user', async () => {
      const inactiveUser = createTestUser({ isActive: false })
      await mockKV.set(`user:${inactiveUser.id}`, inactiveUser)
      await mockKV.set(`user:email:${inactiveUser.email}`, inactiveUser.id)
      
      const result = await Auth.login(inactiveUser.email, 'password123')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Account is inactive')
    })
  })

  describe('logout', () => {
    it('should successfully logout and delete session', async () => {
      const sessionId = 'test-session-id'
      await mockKV.set(`session:${sessionId}`, { userId: testUsers.regularUser.id })
      
      const result = await Auth.logout(sessionId)
      
      expect(result.success).toBe(true)
      
      // Verify session is deleted
      const session = await mockKV.get(`session:${sessionId}`)
      expect(session).toBeNull()
    })

    it('should handle logout with non-existent session', async () => {
      const result = await Auth.logout('non-existent-session')
      
      expect(result.success).toBe(true) // Should not fail
    })
  })

  describe('validateSession', () => {
    it('should return user for valid session', async () => {
      const sessionId = 'test-session-id'
      await mockKV.set(`session:${sessionId}`, { userId: testUsers.regularUser.id })
      await mockKV.set(`user:${testUsers.regularUser.id}`, testUsers.regularUser)
      
      const user = await Auth.validateSession(sessionId)
      
      expect(user).toBeDefined()
      expect(user?.id).toBe(testUsers.regularUser.id)
    })

    it('should return null for invalid session', async () => {
      const user = await Auth.validateSession('invalid-session')
      
      expect(user).toBeNull()
    })

    it('should return null for session with non-existent user', async () => {
      const sessionId = 'test-session-id'
      await mockKV.set(`session:${sessionId}`, { userId: 'non-existent-user' })
      
      const user = await Auth.validateSession(sessionId)
      
      expect(user).toBeNull()
    })
  })

  describe('requireAuth', () => {
    it('should return user for authenticated request', async () => {
      const sessionId = 'test-session-id'
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: sessionId }),
        },
      } as any
      
      await mockKV.set(`session:${sessionId}`, { userId: testUsers.regularUser.id })
      await mockKV.set(`user:${testUsers.regularUser.id}`, testUsers.regularUser)
      
      const user = await Auth.requireAuth(mockRequest)
      
      expect(user).toBeDefined()
      expect(user?.id).toBe(testUsers.regularUser.id)
    })

    it('should throw error for unauthenticated request', async () => {
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue(null),
        },
      } as any
      
      await expect(Auth.requireAuth(mockRequest)).rejects.toThrow('Unauthorized')
    })
  })

  describe('requireRole', () => {
    it('should return user for correct role', async () => {
      const sessionId = 'test-session-id'
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: sessionId }),
        },
      } as any
      
      await mockKV.set(`session:${sessionId}`, { userId: testUsers.adminUser.id })
      await mockKV.set(`user:${testUsers.adminUser.id}`, testUsers.adminUser)
      
      const user = await Auth.requireRole(mockRequest, 'admin')
      
      expect(user).toBeDefined()
      expect(user?.role).toBe('admin')
    })

    it('should throw error for incorrect role', async () => {
      const sessionId = 'test-session-id'
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: sessionId }),
        },
      } as any
      
      await mockKV.set(`session:${sessionId}`, { userId: testUsers.regularUser.id })
      await mockKV.set(`user:${testUsers.regularUser.id}`, testUsers.regularUser)
      
      await expect(Auth.requireRole(mockRequest, 'admin')).rejects.toThrow('Forbidden')
    })
  })
})