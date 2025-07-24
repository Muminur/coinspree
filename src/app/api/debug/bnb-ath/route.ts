import { NextResponse } from 'next/server'
import { CoinGecko } from '@/lib/coingecko'
import { KV } from '@/lib/kv'

export async function GET() {
  try {
    console.log('🔍 Debug: Checking BNB ATH status')
    
    // Get current BNB data from CoinGecko
    const allCoins = await CoinGecko.getTop100()
    const bnbData = allCoins.find(coin => coin.symbol === 'BNB' || coin.id === 'binancecoin')
    
    if (!bnbData) {
      return NextResponse.json({
        success: false,
        error: 'BNB not found in top 100 coins',
        availableCoins: allCoins.slice(0, 10).map(c => ({ id: c.id, symbol: c.symbol, name: c.name }))
      })
    }
    
    // Get stored BNB data from our database
    const storedBnb = await KV.getCrypto(bnbData.id)
    
    // Get recent notifications
    const recentNotifications = await KV.getNotificationsSince(
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    )
    
    const bnbNotifications = recentNotifications.filter(n => 
      n.cryptoId === bnbData.id || n.cryptoId === 'binancecoin'
    )
    
    // Get last cron run
    const lastCronRun = await KV['get']?.('cron:last_run')
    const lastAthCount = await KV['get']?.('cron:last_ath_count')
    
    // Check subscription status
    const allUsers = await KV.getAllUsers()
    const subscribedUsers = []
    
    for (const user of allUsers) {
      const subscription = await KV.getUserSubscription(user.id)
      if (subscription && subscription.status === 'active') {
        const now = new Date()
        const endDate = new Date(subscription.endDate)
        if (endDate > now) {
          subscribedUsers.push({
            email: user.email,
            subscriptionEnd: subscription.endDate,
            notificationsEnabled: user.notificationsEnabled
          })
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        bnbCurrent: {
          id: bnbData.id,
          symbol: bnbData.symbol,
          name: bnbData.name,
          currentPrice: bnbData.currentPrice,
          coinGeckoATH: bnbData.ath,
          coinGeckoATHDate: bnbData.athDate,
          priceChange24h: bnbData.priceChangePercentage24h
        },
        bnbStored: storedBnb ? {
          id: storedBnb.id,
          symbol: storedBnb.symbol,
          name: storedBnb.name,
          currentPrice: storedBnb.currentPrice,
          storedATH: storedBnb.ath,
          storedATHDate: storedBnb.athDate,
          lastUpdated: storedBnb.lastUpdated
        } : 'Not stored in database',
        athComparison: {
          currentVsStored: storedBnb ? bnbData.currentPrice - storedBnb.ath : 'N/A',
          currentVsCoinGecko: bnbData.currentPrice - bnbData.ath,
          isNewATH: storedBnb ? bnbData.currentPrice > storedBnb.ath : false,
          coinGeckoConsidersATH: bnbData.currentPrice >= bnbData.ath
        },
        notifications: {
          recentCount: bnbNotifications.length,
          notifications: bnbNotifications.map(n => ({
            id: n.id,
            newATH: n.newATH,
            previousATH: n.previousATH,
            sentAt: n.sentAt,
            recipientCount: n.recipientCount
          }))
        },
        cronStatus: {
          lastRun: lastCronRun || 'Never',
          lastAthCount: lastAthCount || '0',
          cronRunAge: lastCronRun ? 
            `${Math.round((Date.now() - new Date(lastCronRun as string).getTime()) / 1000 / 60)} minutes ago` : 
            'Never'
        },
        subscribers: {
          count: subscribedUsers.length,
          users: subscribedUsers
        }
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Debug BNB ATH error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to debug BNB ATH status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}