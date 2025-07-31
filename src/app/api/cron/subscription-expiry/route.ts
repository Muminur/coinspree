import { NextRequest, NextResponse } from 'next/server'
import { KV } from '@/lib/kv'
import { sendSubscriptionExpiryEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting subscription expiry check...')
    const startTime = Date.now()
    const cronRunTime = new Date().toISOString()

    // Track cron execution
    await KV.sadd('cron:subscription_runs', cronRunTime)
    await KV.set('cron:subscription_last_run', cronRunTime)

    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Get all active subscriptions
    const activeSubscriptionIds = await KV.smembers('subscriptions:active') || []
    let emailsSent = 0
    let subscriptionsExpired = 0

    for (const subscriptionId of activeSubscriptionIds) {
      const subscription = await KV.hgetall(`subscription:${subscriptionId}`)
      
      if (!subscription) continue

      const endDate = new Date(subscription.endDate)
      const user = await KV.getUserById(subscription.userId)
      
      if (!user) continue

      // Check if subscription has expired
      if (endDate < now) {
        // Move to expired status
        await KV.srem('subscriptions:active', subscriptionId)
        await KV.sadd('subscriptions:expired', subscriptionId)
        await KV.hset(`subscription:${subscriptionId}`, 'status', 'expired')
        
        subscriptionsExpired++
        console.log(`📅 Expired subscription ${subscriptionId} for user ${user.email}`)
        continue
      }

      // Send expiry warnings
      let shouldSendWarning = false
      let warningType = ''

      if (endDate <= oneDayFromNow && endDate > now) {
        shouldSendWarning = true
        warningType = '1-day'
      } else if (endDate <= threeDaysFromNow && endDate > oneDayFromNow) {
        shouldSendWarning = true
        warningType = '3-day'
      } else if (endDate <= sevenDaysFromNow && endDate > threeDaysFromNow) {
        shouldSendWarning = true
        warningType = '7-day'
      }

      if (shouldSendWarning) {
        // Check if we already sent this warning
        const warningKey = `subscription:${subscriptionId}:warning:${warningType}`
        const alreadySent = await KV.get(warningKey)
        
        if (!alreadySent) {
          try {
            await sendSubscriptionExpiryEmail(user, subscription, warningType)
            await KV.set(warningKey, 'sent')
            // Expire warning flag after subscription expires
            await KV.expire(warningKey, Math.ceil((endDate.getTime() - now.getTime()) / 1000) + 86400)
            
            emailsSent++
            console.log(`📧 Sent ${warningType} expiry warning to ${user.email}`)
          } catch (error) {
            console.error(`Failed to send expiry warning to ${user.email}:`, error)
          }
        }
      }
    }

    const duration = Date.now() - startTime
    console.log(`✅ Subscription expiry check completed in ${duration}ms`)
    console.log(`📧 Sent ${emailsSent} expiry warnings`)
    console.log(`📅 Expired ${subscriptionsExpired} subscriptions`)

    // Update cron status
    await KV.set('cron:subscription_last_duration', duration.toString())
    await KV.set('cron:subscription_emails_sent', emailsSent.toString())
    await KV.set('cron:subscription_expired_count', subscriptionsExpired.toString())

    return NextResponse.json({
      success: true,
      duration,
      emailsSent,
      subscriptionsExpired,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Subscription expiry check failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}