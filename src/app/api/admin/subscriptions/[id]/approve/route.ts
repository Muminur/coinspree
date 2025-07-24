import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { SubscriptionLifecycle } from '@/lib/subscription-lifecycle'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require admin authentication
    const session = await Auth.requireAuth()
    const user = await KV.getUserById(session.userId)
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const subscriptionId = params.id

    // Get the subscription
    const subscription = await KV.getSubscriptionById(subscriptionId)
    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Only allow approving pending subscriptions
    if (subscription.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Only pending subscriptions can be approved' },
        { status: 400 }
      )
    }

    // Check if user has existing active subscription
    const existingSubscription = await KV.getUserSubscription(subscription.userId)
    let newEndDate = subscription.endDate

    if (existingSubscription && existingSubscription.status === 'active') {
      // Extend existing subscription
      const existingEndDate = new Date(existingSubscription.endDate)
      const subscriptionDuration = new Date(subscription.endDate).getTime() - new Date(subscription.startDate).getTime()
      newEndDate = new Date(existingEndDate.getTime() + subscriptionDuration).toISOString()
      
      console.log(`🔄 Extending existing subscription for user ${subscription.userId}`)
      console.log(`Previous end date: ${existingSubscription.endDate}`)
      console.log(`New end date: ${newEndDate}`)
    }

    // Update subscription status to active
    const updatedSubscription = {
      ...subscription,
      status: 'active' as const,
      endDate: newEndDate,
      approvedAt: new Date().toISOString(),
      approvedBy: user.id
    }

    await KV.updateSubscription(subscriptionId, updatedSubscription)

    // Move subscription from pending to active set
    await KV['srem']?.('subscriptions:pending', subscriptionId)
    await KV['sadd']?.('subscriptions:active', subscriptionId)

    // Update user notification preferences based on new subscription status
    await SubscriptionLifecycle.onSubscriptionActivated(updatedSubscription)

    console.log(`✅ Subscription ${subscriptionId} approved by admin ${user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Subscription approved successfully',
      data: updatedSubscription
    })

  } catch (error) {
    console.error('Admin subscription approval error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to approve subscription' },
      { status: 500 }
    )
  }
}