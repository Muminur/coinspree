import { NextResponse } from 'next/server'
import { validateServerSession } from '@/lib/auth'
import { KV } from '@/lib/kv'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Require admin authentication
    const session = await validateServerSession()
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const activities = []

    // Get recent user registrations (last 7 days)
    const allUsers = await KV.getAllUsers()
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const recentUsers = allUsers
      .filter(user => new Date(user.createdAt) > weekAgo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)

    recentUsers.forEach(user => {
      activities.push({
        id: `user-${user.id}`,
        type: 'user_registration',
        description: `New user registered: ${user.email}`,
        timestamp: user.createdAt,
        status: user.isActive ? 'success' : 'pending'
      })
    })

    // Get recent subscriptions
    const pendingSubscriptions = await KV.getPendingSubscriptions()
    const recentPending = pendingSubscriptions
      .sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime())
      .slice(0, 5)

    recentPending.forEach(subscription => {
      activities.push({
        id: `sub-${subscription.id}`,
        type: 'subscription_created',
        description: `New subscription created: $${subscription.amount} USDT`,
        timestamp: subscription.createdAt || subscription.startDate,
        status: subscription.status === 'active' ? 'success' : 'pending'
      })
    })

    // Get recent ATH detections (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentATHs = await KV.getNotificationsSince(yesterday.toISOString())
    
    recentATHs.slice(0, 3).forEach(ath => {
      activities.push({
        id: `ath-${ath.id}`,
        type: 'ath_detected',
        description: `ATH detected for ${ath.cryptoId}: $${ath.newATH?.toLocaleString()}`,
        timestamp: ath.sentAt,
        status: 'success'
      })
    })

    // Get recent payment activities (from active subscriptions)
    const activeIds = await KV['smembers']?.('subscriptions:active') || []
    const recentPayments = []
    
    for (const id of activeIds.slice(0, 3)) {
      try {
        const subscription = await KV.getSubscriptionById(id as string)
        if (subscription && subscription.paymentTxHash) {
          recentPayments.push({
            id: `payment-${subscription.id}`,
            type: 'payment_received',
            description: `Payment received: $${subscription.amount} USDT`,
            timestamp: subscription.startDate,
            status: 'success'
          })
        }
      } catch (error) {
        console.error('Error getting payment activity:', error)
      }
    }

    activities.push(...recentPayments)

    // Sort all activities by timestamp (most recent first)
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10) // Limit to 10 most recent activities

    return NextResponse.json({
      success: true,
      data: sortedActivities,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin activity error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity data' },
      { status: 500 }
    )
  }
}