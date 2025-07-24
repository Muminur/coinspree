import { NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { KV } from '@/lib/kv'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Require authentication
    const user = await Auth.requireAuth()

    // Get user's subscription
    const subscription = await KV.getUserSubscription(user.userId)

    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: {
          hasSubscription: false,
          status: null,
          isActive: false,
          daysRemaining: 0,
        },
      })
    }

    // Check if subscription is still active
    const now = new Date()
    const endDate = new Date(subscription.endDate)
    const isActive = subscription.status === 'active' && endDate > now

    // Calculate days remaining
    const daysRemaining = isActive
      ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    // Update subscription status if expired
    if (!isActive && subscription.status === 'active') {
      await KV.updateSubscription(subscription.id, { status: 'expired' })
      subscription.status = 'expired'
    }

    return NextResponse.json({
      success: true,
      data: {
        hasSubscription: true,
        status: subscription.status,
        isActive,
        daysRemaining,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        amount: subscription.amount,
      },
    })
  } catch (error) {
    console.error('❌ Subscription status check failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
