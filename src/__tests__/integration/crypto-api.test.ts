import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'
import { GET as top100Handler } from '@/app/api/crypto/top100/route'
import { POST as updateHandler } from '@/app/api/crypto/update/route'
import { GET as athHistoryHandler } from '@/app/api/crypto/ath-history/route'
import { GET as cronUpdateHandler } from '@/app/api/cron/update-crypto/route'
import { mockKV } from '../../../tests/mocks/kv.mock'
import { mockCryptoData, mockFetchSuccess, mockFetchError, resetMocks } from '../../../tests/mocks/coingecko.mock'
import { testUsers, createTestUser } from '../../../tests/fixtures/users'

function createNextRequest(method: string, headers?: Record<string, string>, searchParams?: Record<string, string>) {
  let url = 'http://localhost:3000/api/test'
  
  if (searchParams) {
    const params = new URLSearchParams(searchParams)
    url += '?' + params.toString()
  }
  
  return new NextRequest(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  })
}

async function createAuthenticatedRequest(method: string, user = testUsers.regularUser, headers?: Record<string, string>, searchParams?: Record<string, string>) {
  const sessionId = 'test-session-' + Date.now()
  await mockKV.set(`session:${sessionId}`, { userId: user.id })
  await mockKV.set(`user:${user.id}`, user)
  
  return createNextRequest(method, {
    cookie: `session=${sessionId}`,
    ...headers,
  }, searchParams)
}

describe('Crypto API Integration Tests', () => {
  beforeEach(() => {
    mockKV.clear()
    resetMocks()
    jest.clearAllMocks()
  })

  describe('GET /api/crypto/top100', () => {
    it('should return top 100 cryptocurrencies for authenticated user', async () => {
      mockFetchSuccess()
      
      const request = await createAuthenticatedRequest('GET')
      const response = await top100Handler(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(3) // Mock data has 3 items
      expect(data.data[0]).toMatchObject({
        id: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        currentPrice: expect.any(Number),
        marketCapRank: 1,
      })
    })

    it('should return cached data when available', async () => {
      // Set cached data
      await mockKV.set('coingecko:top100', mockCryptoData)
      
      const request = await createAuthenticatedRequest('GET')
      const response = await top100Handler(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockCryptoData)
      expect(global.fetch).not.toHaveBeenCalled() // Should use cache
    })

    it('should require authentication', async () => {
      const request = createNextRequest('GET')
      const response = await top100Handler(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle CoinGecko API errors gracefully', async () => {
      mockFetchError(503, 'Service Unavailable')
      
      const request = await createAuthenticatedRequest('GET')
      const response = await top100Handler(request)
      const data = await response.json()
      
      expect(response.status).toBe(503)
      expect(data.success).toBe(false)
      expect(data.error).toContain('CoinGecko API error')
    })

    it('should support pagination', async () => {
      mockFetchSuccess()
      
      const request = await createAuthenticatedRequest('GET', testUsers.regularUser, {}, {
        page: '1',
        limit: '50',
      })
      
      const response = await top100Handler(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.pagination).toBeDefined()
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(50)
    })

    it('should include cache headers for performance', async () => {
      mockFetchSuccess()
      
      const request = await createAuthenticatedRequest('GET')
      const response = await top100Handler(request)
      
      expect(response.headers.get('cache-control')).toBeDefined()
      expect(response.headers.get('cache-control')).toContain('max-age=60') // 1 minute cache
    })
  })

  describe('POST /api/crypto/update', () => {
    it('should allow admin to trigger manual crypto update', async () => {
      mockFetchSuccess()
      
      const request = await createAuthenticatedRequest('POST', testUsers.adminUser)
      const response = await updateHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('updated successfully')
      expect(data.updatedCount).toBe(3) // Mock data has 3 items
    })

    it('should reject non-admin users', async () => {
      const request = await createAuthenticatedRequest('POST', testUsers.regularUser)
      const response = await updateHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Forbidden')
    })

    it('should require authentication', async () => {
      const request = createNextRequest('POST')
      const response = await updateHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle update errors gracefully', async () => {
      mockFetchError(500, 'Internal Server Error')
      
      const request = await createAuthenticatedRequest('POST', testUsers.adminUser)
      const response = await updateHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Failed to update')
    })
  })

  describe('GET /api/crypto/ath-history', () => {
    beforeEach(async () => {
      // Set up mock ATH history data
      const mockNotifications = [
        {
          id: 'notif-1',
          cryptoId: 'bitcoin',
          newATH: 70000,
          previousATH: 69000,
          sentAt: '2024-01-01T00:00:00.000Z',
          recipientCount: 5,
        },
        {
          id: 'notif-2',
          cryptoId: 'ethereum',
          newATH: 5000,
          previousATH: 4800,
          sentAt: '2024-01-02T00:00:00.000Z',
          recipientCount: 3,
        },
      ]
      
      await mockKV.sadd('notifications:log', 'notif-1')
      await mockKV.sadd('notifications:log', 'notif-2')
      await mockKV.set('notification:notif-1', mockNotifications[0])
      await mockKV.set('notification:notif-2', mockNotifications[1])
    })

    it('should return ATH history for authenticated user', async () => {
      const request = await createAuthenticatedRequest('GET')
      const response = await athHistoryHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.data[0]).toMatchObject({
        id: expect.any(String),
        cryptoId: expect.any(String),
        newATH: expect.any(Number),
        previousATH: expect.any(Number),
        sentAt: expect.any(String),
      })
    })

    it('should support time range filtering', async () => {
      const request = await createAuthenticatedRequest('GET', testUsers.regularUser, {}, {
        since: '2024-01-01T12:00:00.000Z',
      })
      
      const response = await athHistoryHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Should only return notifications after the specified time
      expect(data.data).toHaveLength(1)
      expect(data.data[0].cryptoId).toBe('ethereum')
    })

    it('should support crypto filtering', async () => {
      const request = await createAuthenticatedRequest('GET', testUsers.regularUser, {}, {
        cryptoId: 'bitcoin',
      })
      
      const response = await athHistoryHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].cryptoId).toBe('bitcoin')
    })

    it('should require authentication', async () => {
      const request = createNextRequest('GET')
      const response = await athHistoryHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should handle empty history gracefully', async () => {
      // Clear all notifications
      await mockKV.del('notifications:log')
      
      const request = await createAuthenticatedRequest('GET')
      const response = await athHistoryHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(0)
    })
  })

  describe('GET /api/cron/update-crypto', () => {
    it('should process crypto updates with valid cron secret', async () => {
      mockFetchSuccess()
      
      const request = createNextRequest('GET', {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
      })
      
      const response = await cronUpdateHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.duration).toBeDefined()
      expect(data.athCount).toBeDefined()
      expect(data.timestamp).toBeDefined()
    })

    it('should reject requests without valid cron secret', async () => {
      const request = createNextRequest('GET', {
        authorization: 'Bearer invalid-secret',
      })
      
      const response = await cronUpdateHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should reject requests without authorization header', async () => {
      const request = createNextRequest('GET')
      const response = await cronUpdateHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle ATH detection during cron run', async () => {
      // Mock crypto data with new ATH
      const athData = mockCryptoData.map(crypto => ({
        ...crypto,
        currentPrice: crypto.ath + 1000, // Higher than existing ATH
      }))
      
      jest.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => athData.map(crypto => ({
          id: crypto.id,
          symbol: crypto.symbol.toLowerCase(),
          name: crypto.name,
          current_price: crypto.currentPrice,
          market_cap: crypto.marketCap,
          market_cap_rank: crypto.marketCapRank,
          total_volume: crypto.totalVolume,
          ath: crypto.ath,
          ath_date: crypto.athDate,
          last_updated: crypto.lastUpdated,
          price_change_percentage_24h: crypto.priceChangePercentage24h,
        })),
      } as Response)
      
      const request = createNextRequest('GET', {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
      })
      
      const response = await cronUpdateHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.athCount).toBeGreaterThan(0) // Should detect new ATHs
    })

    it('should track cron execution metrics', async () => {
      mockFetchSuccess()
      
      const request = createNextRequest('GET', {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
      })
      
      await cronUpdateHandler(request)
      
      // Verify metrics were stored
      const lastRun = await mockKV.get('cron:last_run')
      const lastDuration = await mockKV.get('cron:last_duration')
      const lastATHCount = await mockKV.get('cron:last_ath_count')
      
      expect(lastRun).toBeDefined()
      expect(lastDuration).toBeDefined()
      expect(lastATHCount).toBeDefined()
    })

    it('should handle cron execution errors gracefully', async () => {
      mockFetchError(503, 'Service Unavailable')
      
      const request = createNextRequest('GET', {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
      })
      
      const response = await cronUpdateHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })

  describe('Data Consistency', () => {
    it('should maintain data consistency during concurrent updates', async () => {
      mockFetchSuccess()
      
      // Simulate concurrent requests
      const requests = Array(5).fill(null).map(() =>
        createAuthenticatedRequest('GET').then(req => top100Handler(req))
      )
      
      const responses = await Promise.all(requests)
      
      // All responses should be successful
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
      
      // Data should be consistent across all responses
      const dataArrays = await Promise.all(
        responses.map(response => response.json().then(data => data.data))
      )
      
      dataArrays.forEach(data => {
        expect(data).toEqual(dataArrays[0]) // All should be identical
      })
    })

    it('should handle database transaction conflicts', async () => {
      // Mock a situation where crypto data is being updated during read
      let readCount = 0
      jest.spyOn(mockKV, 'get').mockImplementation(async (key) => {
        readCount++
        if (readCount === 1) {
          // Simulate concurrent write during first read
          await mockKV.set('coingecko:top100', mockCryptoData)
        }
        return mockKV.getStore().get(key)
      })
      
      const request = await createAuthenticatedRequest('GET')
      const response = await top100Handler(request)
      
      expect(response.status).toBe(200) // Should handle gracefully
    })
  })

  describe('Performance and Caching', () => {
    it('should respect cache TTL', async () => {
      mockFetchSuccess()
      
      // First request should fetch from API
      const request1 = await createAuthenticatedRequest('GET')
      const response1 = await top100Handler(request1)
      
      expect(response1.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledTimes(1)
      
      // Second request should use cache
      const request2 = await createAuthenticatedRequest('GET')
      const response2 = await top100Handler(request2)
      
      expect(response2.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledTimes(1) // Still only 1 call
    })

    it('should handle cache expiration correctly', async () => {
      mockFetchSuccess()
      
      // Set expired cache data
      await mockKV.set('coingecko:top100', mockCryptoData, { ex: -1 }) // Already expired
      
      const request = await createAuthenticatedRequest('GET')
      const response = await top100Handler(request)
      
      expect(response.status).toBe(200)
      expect(global.fetch).toHaveBeenCalled() // Should fetch fresh data
    })
  })

  describe('Error Recovery', () => {
    it('should fallback to cached data when API is unavailable', async () => {
      // Set cached data
      await mockKV.set('coingecko:top100', mockCryptoData)
      
      // Mock API failure
      mockFetchError(503, 'Service Unavailable')
      
      const request = await createAuthenticatedRequest('GET')
      const response = await top100Handler(request)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('x-cache-status')).toBe('stale') // Using stale cache
    })

    it('should implement circuit breaker pattern for API failures', async () => {
      // Simulate multiple consecutive failures
      for (let i = 0; i < 5; i++) {
        mockFetchError(503, 'Service Unavailable')
        
        const request = await createAuthenticatedRequest('GET')
        await top100Handler(request)
      }
      
      // Next request should be short-circuited
      const finalRequest = await createAuthenticatedRequest('GET')
      const finalResponse = await top100Handler(finalRequest)
      
      expect(finalResponse.status).toBe(503)
      expect(finalResponse.headers.get('x-circuit-breaker')).toBe('open')
    })
  })
})