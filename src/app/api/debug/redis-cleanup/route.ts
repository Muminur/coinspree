import { NextResponse } from 'next/server'
import { KV } from '@/lib/kv'

export async function POST() {
  try {
    console.log('🧹 Manual Redis cleanup for pending subscriptions')
    
    // Get current pending set
    const pendingIds = await KV.smembers('subscriptions:pending')
    console.log(`Current pending set: ${pendingIds.length} IDs`)
    
    // Check each ID to see if the subscription still exists
    const validSubscriptions = []
    const invalidIds = []
    
    for (const id of pendingIds) {
      const subscription = await KV.getSubscriptionById(id as string)
      if (subscription && subscription.status === 'pending') {
        validSubscriptions.push(subscription)
        console.log(`✅ Valid: ${id} - User: ${subscription.userId}`)
      } else {
        invalidIds.push(id)
        console.log(`❌ Invalid: ${id} - ${subscription ? `Status: ${subscription.status}` : 'Not found'}`)
      }
    }
    
    console.log(`Found ${validSubscriptions.length} valid and ${invalidIds.length} invalid subscriptions`)
    
    // Remove invalid IDs from the pending set
    let removedCount = 0
    for (const invalidId of invalidIds) {
      const result = await KV.srem('subscriptions:pending', invalidId)
      if (result > 0) {
        removedCount++
        console.log(`🗑️ Removed invalid ID from pending set: ${invalidId}`)
      }
    }
    
    // Now check for duplicates by user
    const subscriptionsByUser = new Map<string, any[]>()
    validSubscriptions.forEach(sub => {
      if (!subscriptionsByUser.has(sub.userId)) {
        subscriptionsByUser.set(sub.userId, [])
      }
      subscriptionsByUser.get(sub.userId)!.push(sub)
    })
    
    let duplicatesCleaned = 0
    for (const [userId, userSubs] of subscriptionsByUser) {
      if (userSubs.length > 1) {
        console.log(`User ${userId} has ${userSubs.length} pending subscriptions - cleaning duplicates`)
        
        // Keep the most recent one
        const sortedSubs = userSubs.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.startDate)
          const dateB = new Date(b.createdAt || b.startDate)
          return dateB.getTime() - dateA.getTime()
        })
        
        const keepSub = sortedSubs[0]
        const removeSubs = sortedSubs.slice(1)
        
        console.log(`  Keeping: ${keepSub.id}`)
        console.log(`  Removing: ${removeSubs.length} duplicates`)
        
        for (const subToRemove of removeSubs) {
          // Remove from pending set
          await KV.srem('subscriptions:pending', subToRemove.id)
          // Remove the actual subscription data
          await KV.del(`subscription:${subToRemove.id}`)
          duplicatesCleaned++
          console.log(`    ✅ Removed duplicate: ${subToRemove.id}`)
        }
      }
    }
    
    // Final verification
    const finalPendingIds = await KV.smembers('subscriptions:pending')
    const finalPendingSubscriptions = await KV.getPendingSubscriptions()
    
    console.log(`Final state: ${finalPendingIds.length} IDs in set, ${finalPendingSubscriptions.length} valid subscriptions`)
    
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          originalPendingIds: pendingIds.length,
          validSubscriptions: validSubscriptions.length,
          invalidIdsRemoved: removedCount,
          duplicatesCleaned,
          finalPendingIds: finalPendingIds.length,
          finalValidSubscriptions: finalPendingSubscriptions.length
        },
        finalPendingSubscriptions: finalPendingSubscriptions.map(sub => ({
          id: sub.id,
          userId: sub.userId,
          amount: sub.amount,
          paymentTxHash: sub.paymentTxHash
        }))
      },
      message: `Cleaned up ${removedCount} invalid IDs and ${duplicatesCleaned} duplicates`
    })
    
  } catch (error) {
    console.error('❌ Redis cleanup error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Redis cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}