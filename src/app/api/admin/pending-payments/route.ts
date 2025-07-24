import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Get all pending payments with detailed information
export async function GET() {
  try {
    console.log('🔍 Admin: Fetching pending payments')
    
    // Require admin authentication
    await Auth.requireAdmin()

    // Get all pending subscriptions
    const pendingSubscriptions = await KV.getPendingSubscriptions()
    console.log(`Found ${pendingSubscriptions.length} pending subscriptions`)

    // Get detailed information for each pending subscription
    const pendingPayments = await Promise.all(
      pendingSubscriptions.map(async (subscription) => {
        try {
          // Get user information
          const user = await KV.getUserById(subscription.userId)
          if (!user) {
            console.warn(`User not found for subscription ${subscription.id}`)
            return null
          }

          // Extract name from email (username part before @)
          const userName = user.email.split('@')[0]
          
          return {
            id: subscription.id,
            userId: subscription.userId,
            user: {
              id: user.id,
              email: user.email,
              name: userName,
              role: user.role,
            },
            amount: subscription.amount,
            paymentTxHash: subscription.paymentTxHash,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            status: subscription.status,
            createdAt: subscription.startDate, // Use startDate as creation time
            tronScanUrl: subscription.paymentTxHash 
              ? `https://tronscan.org/#/transaction/${subscription.paymentTxHash}`
              : null,
          }
        } catch (error) {
          console.error(`Error processing subscription ${subscription.id}:`, error)
          return null
        }
      })
    )

    // Filter out null results
    const validPendingPayments = pendingPayments.filter(payment => payment !== null)
    
    // Sort by creation date (newest first)
    validPendingPayments.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    console.log(`✅ Returning ${validPendingPayments.length} valid pending payments`)

    return NextResponse.json({
      success: true,
      data: validPendingPayments,
      count: validPendingPayments.length,
    })
  } catch (error) {
    console.error('❌ Admin pending payments fetch failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}

// Approve or reject pending payment
const paymentActionSchema = z.object({
  subscriptionId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    console.log('⚡ Admin: Processing payment action')
    
    // Require admin authentication
    const session = await Auth.requireAdmin()

    // Parse request body
    const body = await request.json()
    const { subscriptionId, action, reason } = paymentActionSchema.parse(body)

    console.log(`Processing ${action} for subscription ${subscriptionId}`)

    // Get the subscription
    const subscription = await KV.getSubscriptionById(subscriptionId)
    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Verify it's pending
    if (subscription.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Subscription is not pending' },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      console.log(`🔄 Starting approval process for subscription ${subscriptionId}`)
      
      // Get subscription details before update
      console.log(`📋 Original subscription status: ${subscription.status}`)
      console.log(`📋 Original subscription user: ${subscription.userId}`)
      
      // Approve the subscription
      await KV.updateSubscription(subscriptionId, {
        status: 'active',
      })
      console.log(`✅ Updated subscription status to 'active'`)

      // Verify the update worked
      const updatedSubscription = await KV.getSubscriptionById(subscriptionId)
      console.log(`🔍 Verification - New subscription status: ${updatedSubscription?.status}`)

      // Update subscription lifecycle (enable notifications, etc.)
      const user = await KV.getUserById(subscription.userId)
      if (user) {
        await KV.updateUser(subscription.userId, {
          notificationsEnabled: true,
        })
        console.log(`✅ Enabled notifications for user ${user.email}`)
      } else {
        console.log(`❌ User not found for subscription: ${subscription.userId}`)
      }

      console.log(`✅ Subscription ${subscriptionId} approval process completed`)

      return NextResponse.json({
        success: true,
        message: 'Payment approved successfully',
        data: {
          subscriptionId,
          action: 'approved',
          newStatus: 'active',
        },
      })
    } else if (action === 'reject') {
      // Reject the subscription
      await KV.updateSubscription(subscriptionId, {
        status: 'blocked',
      })

      console.log(`❌ Subscription ${subscriptionId} rejected and blocked`)

      return NextResponse.json({
        success: true,
        message: 'Payment rejected successfully',
        data: {
          subscriptionId,
          action: 'rejected',
          newStatus: 'blocked',
          reason,
        },
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('❌ Admin payment action failed:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}