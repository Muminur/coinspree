import { NextRequest, NextResponse } from 'next/server'
import { validateServerSession } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { SubscriptionLifecycle } from '@/lib/subscription-lifecycle'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require admin authentication
    const session = await validateServerSession()
    if (!session || session.role !== 'admin') {
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

    // Only allow blocking active subscriptions
    if (subscription.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Only active subscriptions can be blocked' },
        { status: 400 }
      )
    }

    // Update subscription status to blocked
    const updatedSubscription = {
      ...subscription,
      status: 'blocked' as const,
      blockedAt: new Date().toISOString(),
      blockedBy: user.id
    }

    await KV.updateSubscription(subscriptionId, updatedSubscription)

    // Move subscription from active to blocked set
    await KV['srem']?.('subscriptions:active', subscriptionId)
    await KV['sadd']?.('subscriptions:blocked', subscriptionId)

    // Update user notification preferences (will disable notifications)
    await SubscriptionLifecycle.onSubscriptionDeactivated(updatedSubscription)

    console.log(`⛔ Subscription ${subscriptionId} blocked by admin ${user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Subscription blocked successfully',
      data: updatedSubscription
    })

  } catch (error) {
    console.error('Admin subscription blocking error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to block subscription' },
      { status: 500 }
    )
  }
}