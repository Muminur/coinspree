import { KV } from './kv'
import { ATHDetector } from './ath-detector'
import { sendSubscriptionExpiryEmail } from './email'
import { EmailQueue } from './email-queue'

/**
 * Background Jobs Manager
 * Consolidates all cron job logic into reusable functions
 * for use in instrumentation.ts background scheduler
 */

export class BackgroundJobs {
  private static isRunning = false
  private static intervals: NodeJS.Timeout[] = []

  /**
   * Start all background jobs with different intervals
   */
  static start() {
    if (this.isRunning) {
      console.log('🔄 Background jobs already running')
      return
    }

    console.log('🚀 Starting background job scheduler...')
    this.isRunning = true

    // ATH Detection - every 1 minute
    const athInterval = setInterval(() => {
      this.runATHDetection().catch(console.error)
    }, 1 * 60 * 1000)

    // Subscription Expiry Check - every 6 hours  
    const subscriptionInterval = setInterval(() => {
      this.runSubscriptionExpiry().catch(console.error)
    }, 6 * 60 * 60 * 1000)

    // Email Queue Processing - every 2 minutes
    const emailInterval = setInterval(() => {
      this.runEmailQueue().catch(console.error)
    }, 2 * 60 * 1000)

    // Store intervals for cleanup
    this.intervals = [athInterval, subscriptionInterval, emailInterval]

    // Run initial checks immediately
    setTimeout(() => this.runATHDetection().catch(console.error), 1000)
    setTimeout(() => this.runSubscriptionExpiry().catch(console.error), 2000)
    setTimeout(() => this.runEmailQueue().catch(console.error), 3000)

    console.log('✅ Background job scheduler started successfully')
    console.log('📊 ATH Detection: every 1 minute')
    console.log('📅 Subscription Expiry: every 6 hours')
    console.log('📧 Email Queue: every 2 minutes')
  }

  /**
   * Stop all background jobs
   */
  static stop() {
    if (!this.isRunning) return

    console.log('⏹️ Stopping background job scheduler...')
    
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals = []
    this.isRunning = false

    console.log('✅ Background job scheduler stopped')
  }

  /**
   * Get current job status
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.intervals.length,
      startedAt: process.env.BACKGROUND_JOBS_START_TIME
    }
  }

  /**
   * ATH Detection Job
   * Detects new All-Time Highs and sends notifications
   */
  static async runATHDetection(): Promise<{ success: boolean; athCount: number; duration: number }> {
    const startTime = Date.now()
    const jobId = `ath-detection-${Date.now()}`
    
    try {
      console.log('🔄 [Background] Starting ATH detection...')
      
      // Track job execution
      const cronRunTime = new Date().toISOString()
      await KV.sadd('cron:runs', cronRunTime)
      await KV.set('cron:last_run', cronRunTime)
      await KV.set('background:ath:last_run', cronRunTime)

      // Run ATH detection
      const notifications = await ATHDetector.runDetection()

      const duration = Date.now() - startTime
      console.log(`✅ [Background] ATH detection completed in ${duration}ms`)
      console.log(`📊 [Background] Found ${notifications.length} new ATHs`)

      // Update job status
      await KV.set('cron:last_duration', duration.toString())
      await KV.set('cron:last_ath_count', notifications.length.toString())
      await KV.set('background:ath:last_duration', duration.toString())
      await KV.set('background:ath:last_count', notifications.length.toString())

      return { success: true, athCount: notifications.length, duration }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error('❌ [Background] ATH detection failed:', error)
      
      await KV.set('background:ath:last_error', (error as Error).message)
      await KV.set('background:ath:last_error_time', new Date().toISOString())

      return { success: false, athCount: 0, duration }
    }
  }

  /**
   * Subscription Expiry Check Job
   * Checks for expiring subscriptions and sends warnings
   */
  static async runSubscriptionExpiry(): Promise<{ success: boolean; emailsSent: number; subscriptionsExpired: number; duration: number }> {
    const startTime = Date.now()
    
    try {
      console.log('🔄 [Background] Starting subscription expiry check...')
      
      // Track job execution
      const cronRunTime = new Date().toISOString()
      await KV.sadd('cron:subscription_runs', cronRunTime)
      await KV.set('cron:subscription_last_run', cronRunTime)
      await KV.set('background:subscription:last_run', cronRunTime)

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
          console.log(`📅 [Background] Expired subscription ${subscriptionId} for user ${user.email}`)
          continue
        }

        // Send expiry warnings
        let shouldSendEmail = false
        let emailType = ''

        if (endDate <= oneDayFromNow && endDate > now) {
          emailType = 'expires_in_1_day'
          shouldSendEmail = true
        } else if (endDate <= threeDaysFromNow && endDate > oneDayFromNow) {
          emailType = 'expires_in_3_days'
          shouldSendEmail = true
        } else if (endDate <= sevenDaysFromNow && endDate > threeDaysFromNow) {
          emailType = 'expires_in_7_days'
          shouldSendEmail = true
        }

        if (shouldSendEmail) {
          // Check if we already sent this type of email
          const emailKey = `expiry_email:${subscriptionId}:${emailType}`
          const alreadySent = await KV.get(emailKey)
          
          if (!alreadySent) {
            await sendSubscriptionExpiryEmail(user, subscription, emailType)
            await KV.set(emailKey, '1')
            await KV.expire(emailKey, 24 * 60 * 60) // Expire after 24 hours
            
            emailsSent++
            console.log(`📧 [Background] Sent ${emailType} email to ${user.email}`)
          }
        }
      }

      const duration = Date.now() - startTime
      console.log(`✅ [Background] Subscription expiry check completed in ${duration}ms`)
      console.log(`📧 [Background] Sent ${emailsSent} expiry emails`)
      console.log(`📅 [Background] Expired ${subscriptionsExpired} subscriptions`)

      // Update job status
      await KV.set('cron:subscription_last_duration', duration.toString())
      await KV.set('background:subscription:last_duration', duration.toString())
      await KV.set('background:subscription:emails_sent', emailsSent.toString())
      await KV.set('background:subscription:expired_count', subscriptionsExpired.toString())

      return { success: true, emailsSent, subscriptionsExpired, duration }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error('❌ [Background] Subscription expiry check failed:', error)
      
      await KV.set('background:subscription:last_error', (error as Error).message)
      await KV.set('background:subscription:last_error_time', new Date().toISOString())

      return { success: false, emailsSent: 0, subscriptionsExpired: 0, duration }
    }
  }

  /**
   * Email Queue Processing Job
   * Processes pending emails from the queue
   */
  static async runEmailQueue(): Promise<{ success: boolean; processed: number; sent: number; failed: number; duration: number }> {
    const startTime = Date.now()
    
    try {
      console.log('🔄 [Background] Starting email queue processing...')
      
      // Track job execution
      const cronRunTime = new Date().toISOString()
      await KV.sadd('cron:email_runs', cronRunTime)
      await KV.set('cron:email_last_run', cronRunTime)
      await KV.set('background:email:last_run', cronRunTime)

      // Process pending emails from queue
      const processResult = await EmailQueue.processQueue()

      const duration = Date.now() - startTime
      console.log(`✅ [Background] Email queue processing completed in ${duration}ms`)
      console.log(`📧 [Background] Processed ${processResult.processed} emails`)
      console.log(`✅ [Background] Sent ${processResult.sent} emails successfully`)
      console.log(`❌ [Background] Failed ${processResult.failed} emails`)

      // Update job status
      await KV.set('cron:email_last_duration', duration.toString())
      await KV.set('cron:email_processed_count', processResult.processed.toString())
      await KV.set('cron:email_sent_count', processResult.sent.toString())
      await KV.set('cron:email_failed_count', processResult.failed.toString())
      await KV.set('background:email:last_duration', duration.toString())
      await KV.set('background:email:last_processed', processResult.processed.toString())
      await KV.set('background:email:last_sent', processResult.sent.toString())
      await KV.set('background:email:last_failed', processResult.failed.toString())

      return { 
        success: true, 
        processed: processResult.processed,
        sent: processResult.sent,
        failed: processResult.failed,
        duration 
      }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error('❌ [Background] Email queue processing failed:', error)
      
      await KV.set('background:email:last_error', (error as Error).message)
      await KV.set('background:email:last_error_time', new Date().toISOString())

      return { success: false, processed: 0, sent: 0, failed: 0, duration }
    }
  }
}