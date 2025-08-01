import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { CoinGecko } from '@/lib/coingecko'

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await Auth.requireAuth()

    // Extract pagination and sorting parameters from URL
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const sortBy = searchParams.get('sortBy') || 'marketCapRank'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    
    // Validate pagination parameters
    const currentPage = Math.max(1, page)
    const pageSize = Math.min(Math.max(1, limit), 100) // Max 100 per page
    
    // Validate sorting parameters
    const validSortFields = ['marketCapRank', 'athDate']
    const validSortOrders = ['asc', 'desc']
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'marketCapRank'
    const finalSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'asc'

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

    // Apply sorting based on sortBy parameter
    if (finalSortBy === 'athDate') {
      // Sort by ATH date
      allATHRecords.sort((a, b) => {
        const dateA = new Date(a.athDate).getTime()
        const dateB = new Date(b.athDate).getTime()
        return finalSortOrder === 'desc' ? dateB - dateA : dateA - dateB
      })
      console.log(`🔍 ATH History: Sorted by ATH date (${finalSortOrder})`)
    } else {
      // Default: Sort by market cap rank (1 = highest market cap)
      allATHRecords.sort((a, b) => {
        return finalSortOrder === 'desc' ? b.marketCapRank - a.marketCapRank : a.marketCapRank - b.marketCapRank
      })
      console.log(`🔍 ATH History: Sorted by market cap rank (${finalSortOrder})`)
    }

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
      sortBy: finalSortBy,
      sortOrder: finalSortOrder,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
