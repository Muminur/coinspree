import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { CoinGecko } from '@/lib/coingecko'

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await Auth.requireAuth()

    // Extract pagination parameters from URL
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    
    // Validate pagination parameters
    const currentPage = Math.max(1, page)
    const pageSize = Math.min(Math.max(1, limit), 100) // Max 100 per page

    // Fetch all current crypto data from CoinGecko (both ranges for comprehensive ATH history)
    console.log('🔍 ATH History: Fetching top 200 cryptocurrency data...')
    const top100Cryptos = await CoinGecko.getTop100()
    const top101to200Cryptos = await CoinGecko.getTop101to200()
    const allCryptos = [...top100Cryptos, ...top101to200Cryptos]
    
    console.log(`🔍 ATH History: Processing ${allCryptos.length} cryptocurrencies (Top 100: ${top100Cryptos.length}, Top 101-200: ${top101to200Cryptos.length})`)
    
    // Transform crypto data into ATH records
    const allATHRecords = allCryptos.map((crypto) => ({
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
    allATHRecords.sort((a, b) => a.marketCapRank - b.marketCapRank)

    // Apply pagination
    const totalRecords = allATHRecords.length
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedRecords = allATHRecords.slice(startIndex, endIndex)

    return NextResponse.json({
      success: true,
      athRecords: paginatedRecords,
      data: paginatedRecords, // Keep both for compatibility
      count: paginatedRecords.length,
      totalRecords,
      currentPage,
      pageSize,
      totalPages: Math.ceil(totalRecords / pageSize),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
