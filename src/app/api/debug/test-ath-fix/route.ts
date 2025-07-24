import { NextResponse } from 'next/server'
import { CoinGecko } from '@/lib/coingecko'
import { KV } from '@/lib/kv'

export async function GET() {
  try {
    console.log('🔧 Testing fixed ATH detection for BNB')
    
    // Get current data
    const allCoins = await CoinGecko.getTop100()
    const bnb = allCoins.find(coin => coin.symbol === 'BNB')
    
    if (!bnb) {
      return NextResponse.json({ success: false, error: 'BNB not found' })
    }
    
    console.log(`BNB Current Price: $${bnb.currentPrice}`)
    console.log(`BNB CoinGecko ATH: $${bnb.ath}`)
    
    // Get stored data
    const stored = await KV.getCrypto(bnb.id)
    console.log(`BNB Stored ATH: $${stored?.ath || 'Not found'}`)
    
    // Test our detectATHUpdates method
    const athUpdates = await CoinGecko.detectATHUpdates([bnb])
    
    console.log(`ATH Updates Found: ${athUpdates.length}`)
    athUpdates.forEach(update => {
      console.log(`🚀 ATH Update for ${update.symbol}:`)
      console.log(`  Current: $${update.currentPrice}`)
      console.log(`  ATH: $${update.ath}`) 
      console.log(`  Previous ATH: $${update.previousATH}`)
    })
    
    return NextResponse.json({
      success: true,
      data: {
        bnb: {
          currentPrice: bnb.currentPrice,
          coinGeckoATH: bnb.ath,
          storedATH: stored?.ath || null
        },
        athUpdatesCount: athUpdates.length,
        athUpdates: athUpdates.map(u => ({
          symbol: u.symbol,
          currentPrice: u.currentPrice,
          ath: u.ath,
          previousATH: u.previousATH
        }))
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Test ATH fix error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}