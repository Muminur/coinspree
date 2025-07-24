import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { CoinGecko } from '@/lib/coingecko'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: /api/crypto/top100 called')
    
    // Check authentication from session
    const session = await Auth.getSession()
    if (!session) {
      console.log('🔍 API: No session found, returning 401')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    console.log('🔍 API: Session found for user:', session.email)
    console.log('🔍 API: Fetching crypto data...')
    
    const cryptos = await CoinGecko.getTop100()
    console.log('🔍 API: Retrieved', cryptos.length, 'cryptocurrencies')

    return NextResponse.json({
      success: true,
      cryptos: cryptos,
      data: cryptos, // Keep both for compatibility
      count: cryptos.length,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('🔍 API Error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
