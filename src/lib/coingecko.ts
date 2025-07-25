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
  private static readonly CACHE_DURATION = 60 // 1 minute

  static async getTop100(): Promise<CryptoAsset[]> {
    // Check cache first
    const cached = await this.getCachedData()
    if (cached) return cached

    // Fetch from API with rate limiting
    const fresh = await this.fetchFromAPI()
    await this.cacheData(fresh)
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

  private static async fetchFromAPI(): Promise<CryptoAsset[]> {
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

    if (process.env.COINGECKO_API_KEY) {
      headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
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
      } else if (coin.currentPrice > previousATH) {
        // True new ATH detected by current price - capture previous ATH before updating
        athUpdates.push({
          ...coin,
          previousATH
        })
        
        await KV.updateCrypto(coin.id, {
          ...coin,
          ath: coin.currentPrice,
          // Use current timestamp since this is a newly detected ATH
          athDate: new Date().toISOString(),
        })
      } else {
        // Check if CoinGecko's ATH data is newer than what we have stored
        if (coin.ath > previousATH) {
          // CoinGecko has a higher ATH than we have stored - this is a missed ATH!
          console.log(`🚨 MISSED ATH DETECTED for ${coin.symbol}!`)
          console.log(`  Current Price: $${coin.currentPrice}`)
          console.log(`  CoinGecko ATH: $${coin.ath} (${coin.athDate})`)
          console.log(`  Our Stored ATH: $${previousATH} (${stored.athDate})`)
          
          // This is a new ATH that we missed - add it to notifications
          athUpdates.push({
            ...coin,
            previousATH
          })
          
          // Update our records with CoinGecko's ATH data
          await KV.updateCrypto(coin.id, {
            ...coin,
            ath: coin.ath,
            athDate: coin.athDate, // Use CoinGecko's ATH date for their detected ATH
          })
        } else {
          // Regular update - keep existing ATH data, update other fields
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
