import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { CoinGecko } from '@/lib/coingecko'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: /api/crypto/top101-200 called')
    
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
    console.log('🔍 API: Fetching top 101-200 crypto data...')
    
    const cryptos = await CoinGecko.getTop101to200()
    console.log('🔍 API: Retrieved', cryptos.length, 'cryptocurrencies (ranks 101-200)')

    return NextResponse.json({
      success: true,
      cryptos: cryptos,
      data: cryptos, // Keep both for compatibility
      count: cryptos.length,
      range: '101-200',
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