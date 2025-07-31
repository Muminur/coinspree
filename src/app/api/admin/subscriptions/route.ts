import { NextRequest, NextResponse } from 'next/server'
import { validateServerSession } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { adminSubscriptionUpdateSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

// Get all subscriptions (admin only)
export async function GET() {
  try {
    // Require admin authentication
    const session = await validateServerSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all users and their subscription histories (including pending)
    const users = await KV.getAllUsers()
    const subscriptions = []

    for (const user of users) {
      const userSubscriptions = await KV.getUserSubscriptionHistory(user.id)
      for (const subscription of userSubscriptions) {
        subscriptions.push({
          ...subscription,
          userId: user.id, // Ensure userId is set
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
        })
      }
    }

    // Sort by creation date (newest first), fallback to startDate if createdAt is missing
    subscriptions.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(a.startDate)
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(b.startDate)
      return dateB.getTime() - dateA.getTime()
    })

    return NextResponse.json({
      success: true,
      data: subscriptions,
      count: subscriptions.length,
    })
  } catch (error) {
    console.error('❌ Admin subscriptions fetch failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}

// Update subscription (admin only)
export async function PATCH(request: NextRequest) {
  try {
    // Require admin authentication
    const session = await validateServerSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { subscriptionId, ...updates } = body

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: 'Subscription ID is required' },
        { status: 400 }
      )
    }

    // Validate updates
    const validation = adminSubscriptionUpdateSchema.safeParse(updates)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: validation.error.issues,
        },
        { status: 400 }
      )
    }

    // Check if subscription exists
    const subscription = await KV.getSubscriptionById(subscriptionId)
    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Update subscription
    await KV.updateSubscription(subscriptionId, validation.data)

    // Get updated subscription with user info
    const updatedSubscription = await KV.getSubscriptionById(subscriptionId)
    const user = await KV.getUserById(subscription.userId)

    console.log(
      `📝 Admin updated subscription ${subscriptionId}:`,
      validation.data
    )

    return NextResponse.json({
      success: true,
      data: {
        ...updatedSubscription,
        user: user
          ? {
              id: user.id,
              email: user.email,
              role: user.role,
            }
          : null,
      },
      message: 'Subscription updated successfully',
    })
  } catch (error) {
    console.error('❌ Admin subscription update failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
