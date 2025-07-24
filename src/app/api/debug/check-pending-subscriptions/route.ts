import { NextResponse } from 'next/server'
import { KV } from '@/lib/kv'

export async function GET() {
  try {
    console.log('🔍 Checking pending subscriptions data')
    
    // Method 1: Use the KV.getPendingSubscriptions() method
    const pendingSubscriptionsMethod = await KV.getPendingSubscriptions()
    console.log(`Method 1 - KV.getPendingSubscriptions(): ${pendingSubscriptionsMethod.length} subscriptions`)
    
    // Method 2: Direct Redis query for pending subscriptions set
    const pendingIds = await KV['smembers']?.('subscriptions:pending') || []
    console.log(`Method 2 - Direct Redis smembers('subscriptions:pending'): ${pendingIds.length} IDs`)
    
    // Method 3: Check each pending subscription individually
    const detailedPendingSubscriptions = await Promise.all(
      pendingIds.map(async (id) => {
        const subscription = await KV.getSubscriptionById(id as string)
        return {
          id,
          subscription: subscription ? {
            id: subscription.id,
            userId: subscription.userId,
            status: subscription.status,
            amount: subscription.amount,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            paymentTxHash: subscription.paymentTxHash
          } : null
        }
      })
    )
    
    console.log('Detailed pending subscriptions:')
    detailedPendingSubscriptions.forEach((item, index) => {
      console.log(`  ${index + 1}. ID: ${item.id}`)
      if (item.subscription) {
        console.log(`     Status: ${item.subscription.status}`)
        console.log(`     User: ${item.subscription.userId}`)
        console.log(`     Amount: $${item.subscription.amount}`)
      } else {
        console.log(`     ERROR: Subscription not found in database`)
      }
    })
    
    // Check for any subscriptions that might have wrong status
    const allSubscriptionSets = {
      active: await KV['smembers']?.('subscriptions:active') || [],
      pending: await KV['smembers']?.('subscriptions:pending') || [],
      expired: await KV['smembers']?.('subscriptions:expired') || [],
      blocked: await KV['smembers']?.('subscriptions:blocked') || []
    }
    
    console.log('All subscription sets:')
    Object.entries(allSubscriptionSets).forEach(([status, ids]) => {
      console.log(`  ${status}: ${ids.length} subscriptions`)
    })
    
    // Check if there are duplicates or stale data
    const allIds = [...allSubscriptionSets.active, ...allSubscriptionSets.pending, ...allSubscriptionSets.expired, ...allSubscriptionSets.blocked]
    const uniqueIds = new Set(allIds)
    const duplicateCount = allIds.length - uniqueIds.size
    
    console.log(`Total subscription IDs across all sets: ${allIds.length}`)
    console.log(`Unique subscription IDs: ${uniqueIds.size}`)
    console.log(`Duplicate entries: ${duplicateCount}`)
    
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          pendingFromMethod: pendingSubscriptionsMethod.length,
          pendingFromRedis: pendingIds.length,
          totalAcrossAllSets: allIds.length,
          uniqueTotalIds: uniqueIds.size,
          duplicateEntries: duplicateCount
        },
        subscriptionSets: {
          active: allSubscriptionSets.active.length,
          pending: allSubscriptionSets.pending.length,
          expired: allSubscriptionSets.expired.length,
          blocked: allSubscriptionSets.blocked.length
        },
        detailedPendingSubscriptions: detailedPendingSubscriptions.map(item => ({
          id: item.id,
          found: !!item.subscription,
          status: item.subscription?.status || 'NOT_FOUND',
          userId: item.subscription?.userId || 'N/A',
          amount: item.subscription?.amount || 0
        })),
        pendingIds: pendingIds,
        methodResults: pendingSubscriptionsMethod.map(sub => ({
          id: sub.id,
          status: sub.status,
          userId: sub.userId,
          amount: sub.amount
        }))
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Check pending subscriptions error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}