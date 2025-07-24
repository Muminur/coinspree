import { CoinGecko } from '@/lib/coingecko'
import { ATHDetector } from '@/lib/ath-detector'
import { mockKV } from '../../../tests/mocks/kv.mock'
import { mockCryptoData, mockCryptoDataWithNewATH, mockFetchSuccess, mockFetchError, resetMocks } from '../../../tests/mocks/coingecko.mock'
import type { CryptoAsset } from '@/types'

describe('Crypto Operations', () => {
  beforeEach(() => {
    mockKV.clear()
    resetMocks()
  })

  describe('CoinGecko API Client', () => {
    describe('getTop100', () => {
      it('should fetch and return top 100 cryptocurrencies', async () => {
        mockFetchSuccess()
        
        const result = await CoinGecko.getTop100()
        
        expect(result).toHaveLength(3)
        expect(result[0]).toMatchObject({
          id: 'bitcoin',
          symbol: 'BTC',
          name: 'Bitcoin',
          currentPrice: 45000,
          marketCapRank: 1,
        })
      })

      it('should return cached data when available', async () => {
        // Set cached data
        await mockKV.set('coingecko:top100', mockCryptoData)
        
        const result = await CoinGecko.getTop100()
        
        expect(result).toEqual(mockCryptoData)
        expect(fetch).not.toHaveBeenCalled()
      })

      it('should handle API errors gracefully', async () => {
        mockFetchError(500, 'Internal Server Error')
        
        await expect(CoinGecko.getTop100()).rejects.toThrow('CoinGecko API error: 500')
      })

      it('should handle network errors', async () => {
        jest.mocked(fetch).mockRejectedValueOnce(new Error('Network Error'))
        
        await expect(CoinGecko.getTop100()).rejects.toThrow('Network Error')
      })

      it('should include API key in headers when provided', async () => {
        process.env.COINGECKO_API_KEY = 'test-api-key'
        mockFetchSuccess()
        
        await CoinGecko.getTop100()
        
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('api.coingecko.com'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'x-cg-demo-api-key': 'test-api-key',
            }),
          })
        )
      })
    })

    describe('detectATHUpdates', () => {
      it('should detect new ATH when current price exceeds stored ATH', async () => {
        // Set up stored crypto data with lower ATH
        const storedCrypto: CryptoAsset = {
          ...mockCryptoData[0],
          ath: 65000, // Lower than current price in test data
        }
        await mockKV.set(`crypto:${storedCrypto.id}`, storedCrypto)
        
        const newData: CryptoAsset[] = [{
          ...mockCryptoData[0],
          currentPrice: 70000, // Higher than stored ATH
        }]
        
        const result = await CoinGecko.detectATHUpdates(newData)
        
        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
          id: 'bitcoin',
          currentPrice: 70000,
          previousATH: 65000,
        })
      })

      it('should detect missed ATH from CoinGecko data', async () => {
        // Set up stored crypto data with lower ATH
        const storedCrypto: CryptoAsset = {
          ...mockCryptoData[0],
          ath: 65000,
        }
        await mockKV.set(`crypto:${storedCrypto.id}`, storedCrypto)
        
        const newData: CryptoAsset[] = [{
          ...mockCryptoData[0],
          currentPrice: 68000, // Lower than CoinGecko ATH but higher than stored
          ath: 70000, // CoinGecko reports higher ATH
        }]
        
        const result = await CoinGecko.detectATHUpdates(newData)
        
        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
          id: 'bitcoin',
          currentPrice: 68000,
          previousATH: 65000,
        })
      })

      it('should not detect ATH when current price is lower', async () => {
        // Set up stored crypto data with higher ATH
        const storedCrypto: CryptoAsset = {
          ...mockCryptoData[0],
          ath: 75000,
        }
        await mockKV.set(`crypto:${storedCrypto.id}`, storedCrypto)
        
        const newData: CryptoAsset[] = [{
          ...mockCryptoData[0],
          currentPrice: 70000, // Lower than stored ATH
        }]
        
        const result = await CoinGecko.detectATHUpdates(newData)
        
        expect(result).toHaveLength(0)
      })

      it('should handle first-time crypto storage', async () => {
        // No stored data for this crypto
        const newData: CryptoAsset[] = [mockCryptoData[0]]
        
        const result = await CoinGecko.detectATHUpdates(newData)
        
        // Should detect ATH for new crypto if current price matches ATH
        if (mockCryptoData[0].currentPrice >= mockCryptoData[0].ath) {
          expect(result).toHaveLength(1)
          expect(result[0].previousATH).toBe(0)
        } else {
          expect(result).toHaveLength(0)
        }
      })
    })
  })

  describe('ATH Detector', () => {
    beforeEach(() => {
      // Mock CoinGecko.getTop100 to return test data
      jest.spyOn(CoinGecko, 'getTop100').mockResolvedValue(mockCryptoData)
      jest.spyOn(CoinGecko, 'detectATHUpdates').mockResolvedValue([
        { ...mockCryptoDataWithNewATH[0], previousATH: 69000 }
      ])
    })

    describe('runDetection', () => {
      it('should successfully run ATH detection process', async () => {
        const result = await ATHDetector.runDetection()
        
        expect(CoinGecko.getTop100).toHaveBeenCalled()
        expect(CoinGecko.detectATHUpdates).toHaveBeenCalledWith(mockCryptoData)
        expect(result).toBeDefined()
      })

      it('should handle errors gracefully', async () => {
        jest.spyOn(CoinGecko, 'getTop100').mockRejectedValueOnce(new Error('API Error'))
        
        const result = await ATHDetector.runDetection()
        
        expect(result).toEqual([])
      })
    })

    describe('getRecentATHs', () => {
      it('should return ATH notifications from specified time period', async () => {
        // Set up mock notification logs
        const mockNotifications = [
          {
            id: 'notif-1',
            cryptoId: 'bitcoin',
            newATH: 70000,
            previousATH: 69000,
            sentAt: new Date().toISOString(),
            recipientCount: 5,
          },
        ]
        
        // Mock the KV method
        jest.spyOn(mockKV, 'get').mockImplementation(async (key) => {
          if (key.startsWith('notification:')) {
            return mockNotifications[0]
          }
          return null
        })
        
        jest.spyOn(mockKV, 'smembers').mockResolvedValue(['notif-1'])
        
        const result = await ATHDetector.getRecentATHs(24)
        
        expect(result).toBeDefined()
      })
    })

    describe('validateATH', () => {
      it('should validate ATH by comparing with current market data', async () => {
        const cryptoId = 'bitcoin'
        
        // Set up stored data
        await mockKV.set(`crypto:${cryptoId}`, {
          ...mockCryptoData[0],
          ath: 70000,
        })
        
        // Mock fresh data with higher price
        jest.spyOn(CoinGecko, 'getTop100').mockResolvedValueOnce([
          { ...mockCryptoData[0], currentPrice: 71000 }
        ])
        
        const result = await ATHDetector.validateATH(cryptoId)
        
        expect(result).toBe(true)
      })

      it('should return false for invalid ATH', async () => {
        const cryptoId = 'bitcoin'
        
        // Set up stored data with higher ATH
        await mockKV.set(`crypto:${cryptoId}`, {
          ...mockCryptoData[0],
          ath: 75000,
        })
        
        // Mock fresh data with lower price
        jest.spyOn(CoinGecko, 'getTop100').mockResolvedValueOnce([
          { ...mockCryptoData[0], currentPrice: 70000 }
        ])
        
        const result = await ATHDetector.validateATH(cryptoId)
        
        expect(result).toBe(false)
      })
    })
  })

  describe('Crypto Data Transformation', () => {
    it('should correctly transform CoinGecko API response', async () => {
      mockFetchSuccess()
      
      const result = await CoinGecko.getTop100()
      
      expect(result[0]).toMatchObject({
        id: 'bitcoin',
        symbol: 'BTC', // Should be uppercase
        name: 'Bitcoin',
        currentPrice: expect.any(Number),
        marketCap: expect.any(Number),
        marketCapRank: expect.any(Number),
        ath: expect.any(Number),
        athDate: expect.any(String),
        lastUpdated: expect.any(String),
      })
    })

    it('should handle missing optional fields gracefully', async () => {
      const incompleteData = [{
        id: 'test-coin',
        symbol: 'test',
        name: 'Test Coin',
        current_price: 100,
        market_cap: 1000000,
        market_cap_rank: 1,
        total_volume: 50000,
        ath: 150,
        ath_date: '2024-01-01T00:00:00.000Z',
        last_updated: '2024-01-01T00:00:00.000Z',
        // Missing price_change_percentage_24h
      }]
      
      mockFetchSuccess(incompleteData)
      
      const result = await CoinGecko.getTop100()
      
      expect(result[0].priceChangePercentage24h).toBe(0) // Should default to 0
    })
  })
})