import { KV } from './kv'
import type { CryptoAsset } from '@/types'

interface CoinGeckoResponse {
  id: string
  symbol: string
  name: string
  current_price: number
  market_cap: number
  market_cap_rank: number
  total_volume: number
  ath: number
  ath_date: string
  last_updated: string
  price_change_percentage_24h: number
}

export class CoinGecko {
  private static readonly BASE_URL = 'https://api.coingecko.com/api/v3'
  private static readonly CACHE_KEY = 'coingecko:top100'
  private static readonly CACHE_KEY_TOP200 = 'coingecko:top200'
  private static readonly CACHE_KEY_101_200 = 'coingecko:101-200'
  private static readonly CACHE_DURATION = 60 // 1 minute
  
  // Rate limiting and circuit breaker
  private static lastAPICall = 0
  private static readonly MIN_API_INTERVAL = 2000 // 2 seconds between calls (30 calls/min = 2s interval)
  private static failureCount = 0
  private static readonly MAX_FAILURES = 3
  private static circuitBreakerOpen = false
  private static circuitBreakerOpenUntil = 0
  private static currentAPIKeyIndex = 0

  static async getTop100(): Promise<CryptoAsset[]> {
    // Check cache first
    const cached = await this.getCachedData()
    if (cached) return cached

    // Fetch from API with rate limiting
    const fresh = await this.fetchFromAPI()
    await this.cacheData(fresh)
    return fresh
  }

  static async getTop200(): Promise<CryptoAsset[]> {
    // Check cache first
    const cached = await this.getCachedDataTop200()
    if (cached) return cached

    // Fetch from API with rate limiting (2 pages)
    const fresh = await this.fetchTop200FromAPI()
    await this.cacheDataTop200(fresh)
    return fresh
  }

  static async getTop101to200(): Promise<CryptoAsset[]> {
    // Check cache first
    const cached = await this.getCachedData101to200()
    if (cached) return cached

    // Fetch from API with rate limiting (page 2 only)
    const fresh = await this.fetch101to200FromAPI()
    await this.cacheData101to200(fresh)
    return fresh
  }

  private static async getCachedData(): Promise<CryptoAsset[] | null> {
    try {
      const cached = await KV.getCryptoCache()
      return cached && cached.length > 0 ? cached : null
    } catch {
      return null
    }
  }

  private static async getCachedDataTop200(): Promise<CryptoAsset[] | null> {
    try {
      const cached = await KV.getCryptoCacheTop200()
      return cached && cached.length > 0 ? cached : null
    } catch {
      return null
    }
  }

  private static async getCachedData101to200(): Promise<CryptoAsset[] | null> {
    try {
      const cached = await KV.getCryptoCache101to200()
      return cached && cached.length > 0 ? cached : null
    } catch {
      return null
    }
  }

  private static getNextAPIKey(): string | null {
    const apiKeys = [
      process.env.COINGECKO_API_KEY,
      process.env.COINGECKO_API_KEY_2,
      process.env.COINGECKO_API_KEY_3
    ].filter(Boolean) as string[]

    if (apiKeys.length === 0) return null

    const apiKey = apiKeys[this.currentAPIKeyIndex % apiKeys.length]
    this.currentAPIKeyIndex = (this.currentAPIKeyIndex + 1) % apiKeys.length
    
    console.log(`🔑 Using CoinGecko API key ${this.currentAPIKeyIndex}/${apiKeys.length}`)
    return apiKey
  }

  private static async enforceRateLimit(): Promise<void> {
    // Check circuit breaker
    if (this.circuitBreakerOpen) {
      if (Date.now() < this.circuitBreakerOpenUntil) {
        throw new Error(`Circuit breaker open until ${new Date(this.circuitBreakerOpenUntil).toISOString()}`)
      } else {
        // Reset circuit breaker
        this.circuitBreakerOpen = false
        this.failureCount = 0
        console.log('🔄 Circuit breaker reset - attempting API call')
      }
    }

    // Enforce rate limiting
    const timeSinceLastCall = Date.now() - this.lastAPICall
    if (timeSinceLastCall < this.MIN_API_INTERVAL) {
      const waitTime = this.MIN_API_INTERVAL - timeSinceLastCall
      console.log(`⏱️ Rate limiting: waiting ${waitTime}ms before next API call`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastAPICall = Date.now()
  }

  private static recordSuccess(): void {
    this.failureCount = 0
    if (this.circuitBreakerOpen) {
      console.log('✅ API call successful - circuit breaker remains closed')
    }
  }

  private static recordFailure(error: Error): void {
    this.failureCount++
    console.warn(`⚠️ API call failed (${this.failureCount}/${this.MAX_FAILURES}): ${error.message}`)
    
    if (this.failureCount >= this.MAX_FAILURES) {
      this.circuitBreakerOpen = true
      this.circuitBreakerOpenUntil = Date.now() + (5 * 60 * 1000) // 5 minutes
      console.error(`🚨 Circuit breaker opened until ${new Date(this.circuitBreakerOpenUntil).toISOString()}`)
    }
  }

  private static async fetchFromAPI(): Promise<CryptoAsset[]> {
    try {
      await this.enforceRateLimit()
      
      const params = new URLSearchParams({
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: '100',
        page: '1',
        sparkline: 'false',
        price_change_percentage: '24h',
      })

      const url = `${this.BASE_URL}/coins/markets?${params}`
      const headers: Record<string, string> = {
        Accept: 'application/json',
      }

      // Use multiple API keys for better rate limiting
      const apiKey = this.getNextAPIKey()
      if (apiKey) {
        headers['x-cg-demo-api-key'] = apiKey
      }

      const response = await fetch(url, { 
        headers,
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      if (!response.ok) {
        const error = new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
        this.recordFailure(error)
        throw error
      }

      const data: CoinGeckoResponse[] = await response.json()
      this.recordSuccess()
      return data.map(this.transformCoinData)
    } catch (error) {
      if (error instanceof Error) {
        this.recordFailure(error)
      }
      throw error
    }
  }

  private static async fetchTop200FromAPI(): Promise<CryptoAsset[]> {
    const allCoins: CryptoAsset[] = []
    
    // Fetch page 1 (coins 1-100)
    const page1Data = await this.fetchPageFromAPI(1)
    allCoins.push(...page1Data)
    
    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Fetch page 2 (coins 101-200)
    const page2Data = await this.fetchPageFromAPI(2)
    allCoins.push(...page2Data)
    
    return allCoins
  }

  private static async fetch101to200FromAPI(): Promise<CryptoAsset[]> {
    // Fetch page 2 only (coins 101-200)
    return await this.fetchPageFromAPI(2)
  }

  private static async fetchPageFromAPI(page: number): Promise<CryptoAsset[]> {
    const params = new URLSearchParams({
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: '100',
      page: page.toString(),
      sparkline: 'false',
      price_change_percentage: '24h',
    })

    const url = `${this.BASE_URL}/coins/markets?${params}`
    const headers: Record<string, string> = {
      Accept: 'application/json',
    }

    // Use multiple API keys for better rate limiting
    const apiKey = this.getNextAPIKey()
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} for page ${page}`)
    }

    const data: CoinGeckoResponse[] = await response.json()
    return data.map(this.transformCoinData)
  }

  private static transformCoinData(coin: CoinGeckoResponse): CryptoAsset {
    return {
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      currentPrice: coin.current_price,
      marketCap: coin.market_cap,
      marketCapRank: coin.market_cap_rank,
      totalVolume: coin.total_volume,
      ath: coin.ath,
      athDate: coin.ath_date,
      lastUpdated: coin.last_updated,
      priceChangePercentage24h: coin.price_change_percentage_24h || 0,
    }
  }

  private static async cacheData(data: CryptoAsset[]): Promise<void> {
    try {
      await KV.setCryptoCache(data, this.CACHE_DURATION)
    } catch (error) {
      console.error('Failed to cache crypto data:', error)
    }
  }

  private static async cacheDataTop200(data: CryptoAsset[]): Promise<void> {
    try {
      await KV.setCryptoCacheTop200(data, this.CACHE_DURATION)
    } catch (error) {
      console.error('Failed to cache top 200 crypto data:', error)
    }
  }

  private static async cacheData101to200(data: CryptoAsset[]): Promise<void> {
    try {
      await KV.setCryptoCache101to200(data, this.CACHE_DURATION)
    } catch (error) {
      console.error('Failed to cache 101-200 crypto data:', error)
    }
  }

  static async detectATHUpdates(
    currentData: CryptoAsset[]
  ): Promise<Array<CryptoAsset & { previousATH: number }>> {
    const athUpdates: Array<CryptoAsset & { previousATH: number }> = []

    for (const coin of currentData) {
      const stored = await KV.getCrypto(coin.id)
      const previousATH = stored?.ath || 0

      if (!stored) {
        // First time storing this coin - use CoinGecko's data as-is
        await KV.updateCrypto(coin.id, coin)
        
        if (coin.currentPrice >= coin.ath) {
          // Current price matches ATH, this is an ATH update
          athUpdates.push({
            ...coin,
            previousATH: 0
          })
        }
      } else {
        // Compare with both current price and CoinGecko's reported ATH
        const realTimeATH = coin.currentPrice > previousATH
        const missedATH = coin.ath > previousATH
        
        if (realTimeATH) {
          // Real-time ATH detected by current price
          console.log(`🚀 REAL-TIME ATH DETECTED for ${coin.symbol}: $${coin.currentPrice} (was $${previousATH})`)
          
          athUpdates.push({
            ...coin,
            previousATH
          })
          
          await KV.updateCrypto(coin.id, {
            ...coin,
            ath: coin.currentPrice,
            athDate: new Date().toISOString(), // Use current timestamp for real-time detection
          })
        } else if (missedATH) {
          // CoinGecko has a higher ATH than we have stored - this is a missed ATH!
          console.log(`🚨 MISSED ATH DETECTED for ${coin.symbol}!`)
          console.log(`  Current Price: $${coin.currentPrice}`)
          console.log(`  CoinGecko ATH: $${coin.ath} (${coin.athDate})`)
          console.log(`  Our Stored ATH: $${previousATH} (${stored.athDate})`)
          
          // Validate that CoinGecko's ATH is reasonable (not more than 10x current price)
          const athRatio = coin.ath / coin.currentPrice
          if (athRatio <= 10) {
            athUpdates.push({
              ...coin,
              previousATH
            })
            
            // Update our records with CoinGecko's ATH data
            await KV.updateCrypto(coin.id, {
              ...coin,
              ath: coin.ath,
              athDate: coin.athDate, // Use CoinGecko's ATH date
            })
          } else {
            console.warn(`⚠️ Suspicious ATH ratio for ${coin.symbol}: ${athRatio.toFixed(2)}x - skipping`)
            // Regular update without ATH change
            await KV.updateCrypto(coin.id, {
              ...coin,
              ath: stored.ath,
              athDate: stored.athDate,
            })
          }
        } else {
          // Regular update - no ATH detected, keep existing ATH data
          await KV.updateCrypto(coin.id, {
            ...coin,
            ath: stored.ath, // Preserve our stored ATH
            athDate: stored.athDate, // Preserve our stored ATH date
          })
        }
      }
    }

    return athUpdates
  }
}
