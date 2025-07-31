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

    // Get all pending subscriptions
    const pendingSubscriptions = await KV.getPendingSubscriptions()

    // Get user details for each subscription
    const subscriptionsWithUsers = await Promise.all(
      pendingSubscriptions.map(async (subscription) => {
        const userData = await KV.getUser(subscription.userId)
        return {
          ...subscription,
          userEmail: userData?.email || 'Unknown'
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: subscriptionsWithUsers,
      count: subscriptionsWithUsers.length
    })

  } catch (error) {
    console.error('❌ Failed to get pending subscriptions:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}