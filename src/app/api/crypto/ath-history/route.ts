import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { CoinGecko } from '@/lib/coingecko'

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await Auth.requireAuth()

    // Fetch all current crypto data from CoinGecko (with ATH info and 24h volume)
    const allCryptos = await CoinGecko.getTop100()
    
    // Transform crypto data into ATH records (sorted by market cap rank)
    const athRecords = allCryptos.map((crypto) => ({
      id: crypto.id,
      cryptoId: crypto.id,
      symbol: crypto.symbol,
      name: crypto.name,
      currentPrice: crypto.currentPrice,
      ath: crypto.ath,
      athDate: crypto.athDate,
      totalVolume: crypto.totalVolume,
      marketCapRank: crypto.marketCapRank,
      lastUpdated: crypto.lastUpdated,
    }))

    // Sort by market cap rank (1 = highest market cap)
    athRecords.sort((a, b) => a.marketCapRank - b.marketCapRank)

    return NextResponse.json({
      success: true,
      athRecords,
      data: athRecords, // Keep both for compatibility
      count: athRecords.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
