import { NextResponse } from 'next/server'
import { KV } from '@/lib/kv'

export async function POST() {
  try {
    console.log('🧹 Cleaning up duplicate pending subscriptions')
    
    // Get all pending subscriptions
    const allPendingSubscriptions = await KV.getPendingSubscriptions()
    console.log(`Total pending subscriptions: ${allPendingSubscriptions.length}`)
    
    // Group by user ID to find duplicates
    const subscriptionsByUser = new Map<string, any[]>()
    
    allPendingSubscriptions.forEach(sub => {
      if (!subscriptionsByUser.has(sub.userId)) {
        subscriptionsByUser.set(sub.userId, [])
      }
      subscriptionsByUser.get(sub.userId)!.push(sub)
    })
    
    console.log(`Pending subscriptions grouped by ${subscriptionsByUser.size} users`)
    
    let totalRemoved = 0
    const cleanupResults = []
    
    // Process each user's pending subscriptions
    for (const [userId, userSubscriptions] of Array.from(subscriptionsByUser.entries())) {
      if (userSubscriptions.length > 1) {
        console.log(`User ${userId} has ${userSubscriptions.length} pending subscriptions - cleaning up duplicates`)
        
        // Sort by creation date, keep the one with createdAt field or the first one
        const sortedSubscriptions = userSubscriptions.sort((a, b) => {
          // Prefer the one with createdAt field
          if (a.createdAt && !b.createdAt) return -1
          if (!a.createdAt && b.createdAt) return 1
          
          // If both have createdAt, use most recent
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          }
          
          // If neither have createdAt, use startDate
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        })
        
        const keepSubscription = sortedSubscriptions[0]
        const removeSubscriptions = sortedSubscriptions.slice(1)
        
        console.log(`  Keeping: ${keepSubscription.id}`)
        console.log(`  Removing: ${removeSubscriptions.length} duplicates`)
        
        // Remove duplicate subscriptions
        for (const subToRemove of removeSubscriptions) {
          try {
            // Remove from pending set
            await KV.srem('subscriptions:pending', subToRemove.id)
            
            // Remove the actual subscription data
            await KV.del(`subscription:${subToRemove.id}`)
            
            console.log(`    ✅ Removed duplicate subscription: ${subToRemove.id}`)
            totalRemoved++
          } catch (error) {
            console.error(`    ❌ Failed to remove subscription ${subToRemove.id}:`, error)
          }
        }
        
        cleanupResults.push({
          userId,
          originalCount: userSubscriptions.length,
          kept: keepSubscription.id,
          removed: removeSubscriptions.map(s => s.id)
        })
      } else {
        console.log(`User ${userId} has 1 pending subscription - no cleanup needed`)
        cleanupResults.push({
          userId,
          originalCount: 1,
          kept: userSubscriptions[0].id,
          removed: []
        })
      }
    }
    
    // Verify the cleanup
    const remainingPendingSubscriptions = await KV.getPendingSubscriptions()
    console.log(`After cleanup: ${remainingPendingSubscriptions.length} pending subscriptions remain`)
    
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          originalPendingCount: allPendingSubscriptions.length,
          remainingPendingCount: remainingPendingSubscriptions.length,
          totalRemoved,
          usersProcessed: subscriptionsByUser.size
        },
        cleanupResults,
        remainingPendingSubscriptions: remainingPendingSubscriptions.map(sub => ({
          id: sub.id,
          userId: sub.userId,
          amount: sub.amount,
          paymentTxHash: sub.paymentTxHash
        }))
      },
      message: `Successfully cleaned up ${totalRemoved} duplicate pending subscriptions`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Cleanup duplicate pending subscriptions error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}