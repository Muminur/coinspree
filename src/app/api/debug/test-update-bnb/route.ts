import { NextResponse } from 'next/server'
import { CoinGecko } from '@/lib/coingecko'
import { KV } from '@/lib/kv'

export async function POST() {
  try {
    console.log('🔧 Testing BNB database update')
    
    // Get current BNB data
    const allCoins = await CoinGecko.getTop100()
    const bnb = allCoins.find(coin => coin.symbol === 'BNB')
    
    if (!bnb) {
      return NextResponse.json({ success: false, error: 'BNB not found' })
    }
    
    console.log('Before update:')
    const beforeUpdate = await KV.getCrypto(bnb.id)
    console.log(`  Stored ATH: $${beforeUpdate?.ath || 'Not found'}`)
    console.log(`  CoinGecko ATH: $${bnb.ath}`)
    
    // Manually update BNB with CoinGecko's ATH
    console.log('Updating BNB with CoinGecko ATH...')
    await KV.updateCrypto(bnb.id, {
      ...bnb,
      ath: bnb.ath,
      athDate: bnb.athDate
    })
    
    console.log('After update:')
    const afterUpdate = await KV.getCrypto(bnb.id)
    console.log(`  Stored ATH: $${afterUpdate?.ath || 'Not found'}`)
    console.log(`  Stored ATH Date: ${afterUpdate?.athDate || 'Not found'}`)
    
    // Now test detectATHUpdates again
    console.log('Testing detectATHUpdates after manual update...')
    const athUpdates = await CoinGecko.detectATHUpdates([bnb])
    console.log(`ATH Updates: ${athUpdates.length}`)
    
    return NextResponse.json({
      success: true,
      data: {
        before: {
          storedATH: beforeUpdate?.ath || null,
          coinGeckoATH: bnb.ath
        },
        after: {
          storedATH: afterUpdate?.ath || null,
          storedATHDate: afterUpdate?.athDate || null
        },
        athUpdatesAfterManualUpdate: athUpdates.length
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Test BNB update error:', error)
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