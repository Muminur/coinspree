import { NextResponse } from 'next/server'
import { KV } from '@/lib/kv'

export async function GET() {
  try {
    console.log('🔍 Identifying user with duplicate pending payments')
    
    // Get the user ID with multiple pending payments
    const duplicateUserId = 'Wu9uCHXd2ykQ19us'
    
    // Get user details
    const user = await KV.getUserById(duplicateUserId)
    console.log(`User: ${user?.email} (ID: ${duplicateUserId})`)
    
    // Get all pending subscriptions for this user
    const allPendingSubscriptions = await KV.getPendingSubscriptions()
    const userPendingSubscriptions = allPendingSubscriptions.filter(sub => sub.userId === duplicateUserId)
    
    console.log(`User has ${userPendingSubscriptions.length} pending subscriptions:`)
    userPendingSubscriptions.forEach((sub, index) => {
      console.log(`  ${index + 1}. ID: ${sub.id}`)
      console.log(`     Amount: $${sub.amount}`)
      console.log(`     Start Date: ${sub.startDate}`)
      console.log(`     Payment TX: ${sub.paymentTxHash}`)
      console.log(`     Created: ${sub.createdAt || 'Unknown'}`)
    })
    
    // Check if user has any active subscriptions
    const userActiveSubscription = await KV.getUserSubscription(duplicateUserId)
    console.log(`User active subscription: ${userActiveSubscription ? userActiveSubscription.id : 'None'}`)
    
    // Get user's subscription history
    const userSubscriptionHistory = await KV.getUserSubscriptionHistory(duplicateUserId)
    console.log(`User total subscription history: ${userSubscriptionHistory.length} subscriptions`)
    
    // Sort pending subscriptions by creation date to identify which one to keep
    const sortedPendingSubscriptions = userPendingSubscriptions.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.startDate)
      const dateB = new Date(b.createdAt || b.startDate)
      return dateB.getTime() - dateA.getTime() // Most recent first
    })
    
    const mostRecentPending = sortedPendingSubscriptions[0]
    const duplicatesToRemove = sortedPendingSubscriptions.slice(1)
    
    console.log(`Most recent pending subscription to keep: ${mostRecentPending.id}`)
    console.log(`Duplicate subscriptions to remove: ${duplicatesToRemove.length}`)
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          email: user?.email || 'Not found',
          id: duplicateUserId
        },
        summary: {
          pendingCount: userPendingSubscriptions.length,
          hasActiveSubscription: !!userActiveSubscription,
          totalSubscriptionHistory: userSubscriptionHistory.length
        },
        pendingSubscriptions: userPendingSubscriptions.map(sub => ({
          id: sub.id,
          amount: sub.amount,
          startDate: sub.startDate,
          paymentTxHash: sub.paymentTxHash,
          createdAt: sub.createdAt
        })),
        recommendation: {
          keepSubscription: {
            id: mostRecentPending.id,
            reason: 'Most recent submission'
          },
          removeSubscriptions: duplicatesToRemove.map(sub => ({
            id: sub.id,
            reason: 'Duplicate older submission'
          }))
        },
        activeSubscription: userActiveSubscription ? {
          id: userActiveSubscription.id,
          status: userActiveSubscription.status,
          endDate: userActiveSubscription.endDate
        } : null
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Identify duplicate user error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Identification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}