// Mock implementation of CoinGecko API for testing
import type { CryptoAsset } from '@/types'

export const mockCryptoData: CryptoAsset[] = [
  {
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    currentPrice: 45000,
    marketCap: 850000000000,
    marketCapRank: 1,
    totalVolume: 25000000000,
    ath: 69000,
    athDate: '2021-11-10T14:24:11.849Z',
    lastUpdated: '2024-01-01T00:00:00.000Z',
    priceChangePercentage24h: 2.5,
  },
  {
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    currentPrice: 2800,
    marketCap: 340000000000,
    marketCapRank: 2,
    totalVolume: 15000000000,
    ath: 4878,
    athDate: '2021-11-10T14:24:19.604Z',
    lastUpdated: '2024-01-01T00:00:00.000Z',
    priceChangePercentage24h: 1.8,
  },
  {
    id: 'binancecoin',
    symbol: 'BNB',
    name: 'BNB',
    currentPrice: 320,
    marketCap: 48000000000,
    marketCapRank: 3,
    totalVolume: 1200000000,
    ath: 686.31,
    athDate: '2021-05-10T07:24:17.097Z',
    lastUpdated: '2024-01-01T00:00:00.000Z',
    priceChangePercentage24h: -0.5,
  },
]

export const mockCryptoDataWithNewATH: CryptoAsset[] = [
  {
    ...mockCryptoData[0],
    currentPrice: 70000, // New ATH
    ath: 70000,
    athDate: new Date().toISOString(),
  },
  ...mockCryptoData.slice(1),
]

export const mockCoinGeckoResponse = mockCryptoData.map(crypto => ({
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
}))

// Mock fetch for CoinGecko API
global.fetch = jest.fn()

export const mockFetchSuccess = (data = mockCoinGeckoResponse) => {
  ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => data,
  } as Response)
}

export const mockFetchError = (status = 500, message = 'Internal Server Error') => {
  ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
    ok: false,
    status,
    statusText: message,
    json: async () => ({ error: message }),
  } as Response)
}

export const mockFetchNetworkError = () => {
  ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
    new Error('Network Error')
  )
}

// Mock the CoinGecko module
jest.mock('@/lib/coingecko', () => ({
  CoinGecko: {
    async getTop100(): Promise<CryptoAsset[]> {
      return mockCryptoData
    },

    async detectATHUpdates(currentData: CryptoAsset[]): Promise<Array<CryptoAsset & { previousATH: number }>> {
      // Simulate ATH detection logic
      const athUpdates: Array<CryptoAsset & { previousATH: number }> = []
      
      for (const coin of currentData) {
        // For testing, we'll say Bitcoin has a new ATH if price > 60000
        if (coin.id === 'bitcoin' && coin.currentPrice > 60000) {
          athUpdates.push({
            ...coin,
            previousATH: 69000,
          })
        }
      }
      
      return athUpdates
    },
  },
}))

export const resetMocks = () => {
  jest.clearAllMocks()
  ;(fetch as jest.MockedFunction<typeof fetch>).mockClear()
}