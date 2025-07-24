import { NextResponse } from 'next/server'
import { CoinGecko } from '@/lib/coingecko'
import { KV } from '@/lib/kv'

export async function POST() {
  try {
    console.log('🔍 Detailed BNB ATH Debug: Starting analysis')
    
    // Get current BNB data from CoinGecko
    const allCoins = await CoinGecko.getTop100()
    const bnbData = allCoins.find(coin => coin.symbol === 'BNB' || coin.id === 'binancecoin')
    
    if (!bnbData) {
      return NextResponse.json({
        success: false,
        error: 'BNB not found in top 100 coins'
      })
    }
    
    // Get stored BNB data
    const storedBnb = await KV.getCrypto(bnbData.id)
    
    console.log('🔍 BNB Current Data from CoinGecko:')
    console.log(`  ID: ${bnbData.id}`)
    console.log(`  Symbol: ${bnbData.symbol}`)
    console.log(`  Current Price: $${bnbData.currentPrice}`)
    console.log(`  CoinGecko ATH: $${bnbData.ath}`)
    console.log(`  CoinGecko ATH Date: ${bnbData.athDate}`)
    
    if (storedBnb) {
      console.log('🔍 BNB Stored Data in our DB:')
      console.log(`  Stored Current Price: $${storedBnb.currentPrice}`)
      console.log(`  Stored ATH: $${storedBnb.ath}`)
      console.log(`  Stored ATH Date: ${storedBnb.athDate}`)
      console.log(`  Last Updated: ${storedBnb.lastUpdated}`)
    } else {
      console.log('🔍 BNB not found in our database')
    }
    
    // Manual ATH detection logic
    const previousATH = storedBnb?.ath || 0
    console.log('🔍 ATH Detection Logic:')
    console.log(`  Previous ATH: $${previousATH}`)
    console.log(`  Current Price: $${bnbData.currentPrice}`)
    console.log(`  CoinGecko ATH: $${bnbData.ath}`)
    console.log(`  Current > Previous: ${bnbData.currentPrice > previousATH}`)
    console.log(`  CoinGecko ATH > Previous: ${bnbData.ath > previousATH}`)
    
    // Simulate detectATHUpdates logic
    let shouldTriggerATH = false
    let athType = 'NONE'
    
    if (!storedBnb) {
      console.log('🔍 First time storing - checking if current matches ATH')
      if (bnbData.currentPrice >= bnbData.ath) {
        shouldTriggerATH = true
        athType = 'FIRST_TIME'
      }
    } else if (bnbData.currentPrice > previousATH) {
      console.log('🔍 Real-time ATH detected')
      shouldTriggerATH = true
      athType = 'REAL_TIME'
    } else if (bnbData.ath > previousATH && bnbData.currentPrice <= previousATH) {
      console.log('🔍 Missed ATH detected')
      shouldTriggerATH = true
      athType = 'MISSED'
    }
    
    console.log(`🔍 Should trigger ATH notification: ${shouldTriggerATH} (${athType})`)
    
    // Now actually run the detectATHUpdates for BNB only
    console.log('🔍 Running actual detectATHUpdates...')
    const athUpdates = await CoinGecko.detectATHUpdates([bnbData])
    
    console.log(`🔍 ATH Updates returned: ${athUpdates.length}`)
    athUpdates.forEach((update, index) => {
      console.log(`  Update ${index + 1}:`)
      console.log(`    ID: ${update.id}`)
      console.log(`    Symbol: ${update.symbol}`)
      console.log(`    Current Price: $${update.currentPrice}`)
      console.log(`    ATH: $${update.ath}`)
      console.log(`    Previous ATH: $${update.previousATH}`)
    })
    
    return NextResponse.json({
      success: true,
      data: {
        bnbData: {
          id: bnbData.id,
          symbol: bnbData.symbol,
          currentPrice: bnbData.currentPrice,
          coinGeckoATH: bnbData.ath,
          coinGeckoATHDate: bnbData.athDate
        },
        storedData: storedBnb || 'Not found',
        analysis: {
          previousATH,
          currentVsPrevious: bnbData.currentPrice - previousATH,
          coinGeckoVsPrevious: bnbData.ath - previousATH,
          shouldTriggerATH,
          athType,
          actualUpdatesCount: athUpdates.length,
          actualUpdates: athUpdates.map(u => ({
            id: u.id,
            symbol: u.symbol,
            currentPrice: u.currentPrice,
            ath: u.ath,
            previousATH: u.previousATH
          }))
        }
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Detailed BNB debug error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Detailed BNB debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}