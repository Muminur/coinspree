import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { TronPayment } from '@/lib/tron'
import { StringUtils } from '@/lib/utils'
import { subscriptionCreateSchema } from '@/lib/validations'
import type { Subscription } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await Auth.requireAuth()

    // Parse and validate request body
    const body = await request.json()
    const validation = subscriptionCreateSchema.safeParse(body)

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

    const { paymentTxHash, amount, duration } = validation.data

    // Check existing subscriptions (allow multiple, but track them)
    const existingSubscription = await KV.getUserSubscription(user.userId)
    const hasPendingSubscription = await KV.getUserPendingSubscriptions(user.userId)
    
    console.log(`📊 User subscription status:`, {
      hasActive: existingSubscription?.status === 'active',
      hasPending: hasPendingSubscription.length > 0,
      existingEndDate: existingSubscription?.endDate
    })

    // Get subscription configuration
    const subscriptionPrice = parseFloat(
      process.env.SUBSCRIPTION_PRICE_USDT || '10'
    )
    // Use the duration from the request (plan-specific) or fallback to environment variable
    const subscriptionDays = duration || parseInt(
      process.env.SUBSCRIPTION_DURATION_DAYS || '30'
    )
    
    console.log(`⏱️ Subscription duration calculation:`, {
      requestedDuration: duration,
      envDuration: process.env.SUBSCRIPTION_DURATION_DAYS,
      finalDuration: subscriptionDays,
      isYearlyPlan: subscriptionDays === 365
    })
    const walletAddress = process.env.TRON_WALLET_ADDRESS

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet configuration not available' },
        { status: 500 }
      )
    }

    // Create subscription record with PENDING status for manual admin approval
    console.log(`📋 Creating pending subscription for manual approval: ${paymentTxHash}`)

    const now = new Date()
    
    // Calculate start and end dates based on existing subscription
    let startDate: Date
    let endDate: Date
    
    if (existingSubscription && existingSubscription.status === 'active') {
      const currentEndDate = new Date(existingSubscription.endDate)
      if (currentEndDate > now) {
        // Extend from current end date
        startDate = currentEndDate
        endDate = new Date(currentEndDate.getTime() + subscriptionDays * 24 * 60 * 60 * 1000)
        console.log(`🔄 Extending existing subscription from ${currentEndDate.toISOString()}`)
      } else {
        // Current subscription expired, start from now
        startDate = now
        endDate = new Date(now.getTime() + subscriptionDays * 24 * 60 * 60 * 1000)
      }
    } else {
      // No active subscription, start from now
      startDate = now
      endDate = new Date(now.getTime() + subscriptionDays * 24 * 60 * 60 * 1000)
    }

    const subscription: Subscription = {
      id: StringUtils.generateId(16),
      userId: user.userId,
      status: 'pending', // Will be approved by admin
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      paymentTxHash,
      amount: amount,
      createdAt: now.toISOString(),
    }

    // Save subscription to database
    await KV.createSubscription(subscription)

    // Log pending subscription creation
    console.log(`📋 Pending subscription created for user ${user.email}:`, {
      subscriptionId: subscription.id,
      amount: subscription.amount,
      duration: subscriptionDays,
      txHash: paymentTxHash,
      status: 'pending'
    })

    const extensionInfo = existingSubscription && existingSubscription.status === 'active' 
      ? `Your subscription will be extended until ${endDate.toLocaleDateString()}.` 
      : `Your subscription will be valid until ${endDate.toLocaleDateString()}.`

    return NextResponse.json({
      success: true,
      data: subscription,
      message: `Payment submitted successfully. Your subscription is pending admin approval. ${extensionInfo}`,
      status: 'pending',
      willExtend: existingSubscription && existingSubscription.status === 'active',
      newEndDate: endDate.toISOString()
    })
  } catch (error) {
    console.error('❌ Subscription creation failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
