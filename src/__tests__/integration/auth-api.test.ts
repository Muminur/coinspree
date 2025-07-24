import { createMocks } from 'node-mocks-http'
import { NextRequest, NextResponse } from 'next/server'
import { POST as registerHandler } from '@/app/api/auth/register/route'
import { POST as loginHandler } from '@/app/api/auth/login/route'
import { POST as logoutHandler } from '@/app/api/auth/logout/route'
import { GET as meHandler } from '@/app/api/auth/me/route'
import { mockKV } from '../../../tests/mocks/kv.mock'
import { testUsers, createTestUser } from '../../../tests/fixtures/users'

// Mock bcrypt for consistent testing
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}))

// Helper function to create NextRequest from mock
function createNextRequest(method: string, body?: any, headers?: Record<string, string>) {
  const url = 'http://localhost:3000/api/test'
  const request = new NextRequest(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return request
}

describe('Authentication API Integration Tests', () => {
  beforeEach(() => {
    mockKV.clear()
    jest.clearAllMocks()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      }
      
      const request = createNextRequest('POST', userData)
      const response = await registerHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe(userData.email)
      expect(data.user.passwordHash).toBeUndefined() // Should not expose password hash
      expect(data.sessionId).toBeDefined()
    })

    it('should reject registration with existing email', async () => {
      // Pre-register a user
      const existingUser = createTestUser()
      await mockKV.set(`user:email:${existingUser.email}`, existingUser.id)
      
      const userData = {
        email: existingUser.email,
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      }
      
      const request = createNextRequest('POST', userData)
      const response = await registerHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('User already exists')
    })

    it('should reject registration with invalid data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'weak',
        confirmPassword: 'different',
      }
      
      const request = createNextRequest('POST', invalidData)
      const response = await registerHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errors).toBeDefined()
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json',
      })
      
      const response = await registerHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should set secure session cookie', async () => {
      const userData = {
        email: 'cookie-test@test.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      }
      
      const request = createNextRequest('POST', userData)
      const response = await registerHandler(request)
      
      expect(response.status).toBe(201)
      
      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toContain('session=')
      expect(setCookieHeader).toContain('HttpOnly')
      expect(setCookieHeader).toContain('Secure')
      expect(setCookieHeader).toContain('SameSite=Strict')
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Set up test user
      await mockKV.set(`user:${testUsers.regularUser.id}`, testUsers.regularUser)
      await mockKV.set(`user:email:${testUsers.regularUser.email}`, testUsers.regularUser.id)
    })

    it('should login with correct credentials', async () => {
      const loginData = {
        email: testUsers.regularUser.email,
        password: 'password123',
      }
      
      const request = createNextRequest('POST', loginData)
      const response = await loginHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toBeDefined()
      expect(data.user.id).toBe(testUsers.regularUser.id)
      expect(data.sessionId).toBeDefined()
    })

    it('should reject login with incorrect password', async () => {
      const bcrypt = require('bcryptjs')
      bcrypt.compare.mockResolvedValueOnce(false)
      
      const loginData = {
        email: testUsers.regularUser.email,
        password: 'wrongpassword',
      }
      
      const request = createNextRequest('POST', loginData)
      const response = await loginHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid credentials')
    })

    it('should reject login with non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'password123',
      }
      
      const request = createNextRequest('POST', loginData)
      const response = await loginHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid credentials')
    })

    it('should update last login timestamp', async () => {
      const loginData = {
        email: testUsers.regularUser.email,
        password: 'password123',
      }
      
      const request = createNextRequest('POST', loginData)
      await loginHandler(request)
      
      const updatedUser = await mockKV.get(`user:${testUsers.regularUser.id}`)
      expect(updatedUser.lastLogin).not.toBe(testUsers.regularUser.lastLogin)
    })

    it('should reject login with inactive user', async () => {
      const inactiveUser = createTestUser({ isActive: false })
      await mockKV.set(`user:${inactiveUser.id}`, inactiveUser)
      await mockKV.set(`user:email:${inactiveUser.email}`, inactiveUser.id)
      
      const loginData = {
        email: inactiveUser.email,
        password: 'password123',
      }
      
      const request = createNextRequest('POST', loginData)
      const response = await loginHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Account is inactive')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid session', async () => {
      const sessionId = 'test-session-123'
      await mockKV.set(`session:${sessionId}`, { userId: testUsers.regularUser.id })
      
      const request = createNextRequest('POST', {}, {
        cookie: `session=${sessionId}`,
      })
      
      const response = await logoutHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verify session was deleted
      const session = await mockKV.get(`session:${sessionId}`)
      expect(session).toBeNull()
    })

    it('should handle logout with no session cookie', async () => {
      const request = createNextRequest('POST', {})
      const response = await logoutHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true) // Should not fail
    })

    it('should clear session cookie on logout', async () => {
      const sessionId = 'test-session-456'
      await mockKV.set(`session:${sessionId}`, { userId: testUsers.regularUser.id })
      
      const request = createNextRequest('POST', {}, {
        cookie: `session=${sessionId}`,
      })
      
      const response = await logoutHandler(request)
      
      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toContain('session=;')
      expect(setCookieHeader).toContain('Max-Age=0')
    })
  })

  describe('GET /api/auth/me', () => {
    beforeEach(async () => {
      await mockKV.set(`user:${testUsers.regularUser.id}`, testUsers.regularUser)
    })

    it('should return user data for authenticated request', async () => {
      const sessionId = 'valid-session-789'
      await mockKV.set(`session:${sessionId}`, { userId: testUsers.regularUser.id })
      
      const request = createNextRequest('GET', undefined, {
        cookie: `session=${sessionId}`,
      })
      
      const response = await meHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toBeDefined()
      expect(data.user.id).toBe(testUsers.regularUser.id)
      expect(data.user.email).toBe(testUsers.regularUser.email)
      expect(data.user.passwordHash).toBeUndefined() // Should not expose password
    })

    it('should return 401 for unauthenticated request', async () => {
      const request = createNextRequest('GET')
      const response = await meHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 for invalid session', async () => {
      const request = createNextRequest('GET', undefined, {
        cookie: 'session=invalid-session-id',
      })
      
      const response = await meHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should return 401 for session with non-existent user', async () => {
      const sessionId = 'orphaned-session'
      await mockKV.set(`session:${sessionId}`, { userId: 'non-existent-user' })
      
      const request = createNextRequest('GET', undefined, {
        cookie: `session=${sessionId}`,
      })
      
      const response = await meHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('Rate Limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      const userData = {
        email: 'ratelimit@test.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      }
      
      // Make multiple rapid requests
      const requests = Array(10).fill(null).map(() => 
        registerHandler(createNextRequest('POST', userData))
      )
      
      const responses = await Promise.all(requests)
      
      // At least some should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  describe('Input Sanitization', () => {
    it('should sanitize malicious input', async () => {
      const maliciousData = {
        email: '<script>alert("xss")</script>@test.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      }
      
      const request = createNextRequest('POST', maliciousData)
      const response = await registerHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(400) // Should reject malicious input
      expect(data.success).toBe(false)
    })

    it('should handle SQL injection attempts', async () => {
      const sqlInjectionData = {
        email: "test@test.com'; DROP TABLE users; --",
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      }
      
      const request = createNextRequest('POST', sqlInjectionData)
      const response = await registerHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(400) // Should reject invalid email format
      expect(data.success).toBe(false)
    })
  })

  describe('Cross-Origin Requests', () => {
    it('should handle CORS preflight requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'OPTIONS',
        headers: {
          'origin': 'http://localhost:3001',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type',
        },
      })
      
      const response = await registerHandler(request)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('access-control-allow-origin')).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock KV error
      jest.spyOn(mockKV, 'get').mockRejectedValueOnce(new Error('Database connection failed'))
      
      const loginData = {
        email: testUsers.regularUser.email,
        password: 'password123',
      }
      
      const request = createNextRequest('POST', loginData)
      const response = await loginHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Internal server error')
    })

    it('should handle unexpected errors without exposing internals', async () => {
      // Mock unexpected error in bcrypt
      const bcrypt = require('bcryptjs')
      bcrypt.compare.mockRejectedValueOnce(new Error('Unexpected bcrypt error'))
      
      const loginData = {
        email: testUsers.regularUser.email,
        password: 'password123',
      }
      
      const request = createNextRequest('POST', loginData)
      const response = await loginHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).not.toContain('bcrypt') // Should not expose internal error details
    })
  })
})