import { KV } from './kv'
import { sendATHNotificationEmail, sendWelcomeEmail, sendSubscriptionExpiryEmail, sendPasswordResetEmail } from './email'

interface QueuedEmail {
  id: string
  type: 'ath_notification' | 'welcome' | 'subscription_expiry' | 'password_reset'
  recipient: any // User object
  data: any // Email-specific data
  attempts: number
  maxAttempts: number
  scheduledFor: string
  createdAt: string
}

export class EmailQueue {
  private static readonly QUEUE_KEY = 'email:queue'
  private static readonly PROCESSING_KEY = 'email:processing'
  private static readonly MAX_BATCH_SIZE = 10

  /**
   * Add email to queue
   */
  static async addToQueue(
    type: QueuedEmail['type'],
    recipient: any,
    data: any,
    scheduleDelay: number = 0
  ): Promise<string> {
    const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const scheduledFor = new Date(Date.now() + scheduleDelay).toISOString()

    const queuedEmail: QueuedEmail = {
      id: emailId,
      type,
      recipient,
      data,
      attempts: 0,
      maxAttempts: 3,
      scheduledFor,
      createdAt: new Date().toISOString()
    }

    // Add to queue with score as scheduled timestamp for sorted retrieval
    const score = new Date(scheduledFor).getTime()
    await KV.zadd(this.QUEUE_KEY, score, JSON.stringify(queuedEmail))

    console.log(`📬 Added ${type} email to queue for ${recipient.email}, scheduled for ${scheduledFor}`)
    return emailId
  }

  /**
   * Process pending emails from queue
   */
  static async processQueue(): Promise<{
    processed: number
    sent: number
    failed: number
    remaining: number
  }> {
    const now = Date.now()
    let processed = 0
    let sent = 0
    let failed = 0

    try {
      // Get emails scheduled for now or earlier
      const pendingEmails = await KV.zrange(
        this.QUEUE_KEY,
        0,
        now,
        'BYSCORE',
        'LIMIT',
        0,
        this.MAX_BATCH_SIZE
      ) || []

      for (const emailData of pendingEmails) {
        try {
          const queuedEmail: QueuedEmail = JSON.parse(emailData as string)
          processed++

          // Move to processing to prevent duplicate processing
          await KV.sadd(this.PROCESSING_KEY, queuedEmail.id)
          await KV.zrem(this.QUEUE_KEY, emailData)

          const sendResult = await this.processEmail(queuedEmail)

          if (sendResult.success) {
            sent++
            console.log(`✅ Successfully sent ${queuedEmail.type} email to ${queuedEmail.recipient.email}`)
          } else {
            // Handle retry logic
            queuedEmail.attempts++
            
            if (queuedEmail.attempts < queuedEmail.maxAttempts) {
              // Exponential backoff: retry after 2^attempts minutes
              const retryDelay = Math.pow(2, queuedEmail.attempts) * 60 * 1000
              queuedEmail.scheduledFor = new Date(Date.now() + retryDelay).toISOString()
              
              // Re-add to queue
              const score = new Date(queuedEmail.scheduledFor).getTime()
              await KV.zadd(this.QUEUE_KEY, score, JSON.stringify(queuedEmail))
              
              console.log(`🔄 Retrying ${queuedEmail.type} email to ${queuedEmail.recipient.email} in ${retryDelay/1000}s (attempt ${queuedEmail.attempts}/${queuedEmail.maxAttempts})`)
            } else {
              failed++
              console.error(`❌ Failed to send ${queuedEmail.type} email to ${queuedEmail.recipient.email} after ${queuedEmail.maxAttempts} attempts`)
              
              // Store failed email for manual review
              await KV.hset(`email:failed:${queuedEmail.id}`, {
                ...queuedEmail,
                failedAt: new Date().toISOString(),
                lastError: sendResult.error || 'Unknown error'
              })
            }
          }

          // Remove from processing
          await KV.srem(this.PROCESSING_KEY, queuedEmail.id)

        } catch (error) {
          console.error('Error processing queued email:', error)
          failed++
        }
      }

      // Get remaining queue size
      const remaining = await KV.zcard?.(this.QUEUE_KEY) || 0

      return { processed, sent, failed, remaining }

    } catch (error) {
      console.error('Error processing email queue:', error)
      return { processed, sent, failed, remaining: 0 }
    }
  }

  /**
   * Process individual email
   */
  private static async processEmail(queuedEmail: QueuedEmail): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      switch (queuedEmail.type) {
        case 'ath_notification':
          await sendATHNotificationEmail(
            queuedEmail.recipient,
            queuedEmail.data.cryptoAsset,
            queuedEmail.data.newATH,
            queuedEmail.data.previousATH
          )
          break

        case 'welcome':
          await sendWelcomeEmail(queuedEmail.recipient)
          break

        case 'subscription_expiry':
          await sendSubscriptionExpiryEmail(
            queuedEmail.recipient,
            queuedEmail.data.subscription,
            queuedEmail.data.warningType
          )
          break

        case 'password_reset':
          await sendPasswordResetEmail(
            queuedEmail.recipient,
            queuedEmail.data.token
          )
          break

        default:
          throw new Error(`Unknown email type: ${queuedEmail.type}`)
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get queue status
   */
  static async getQueueStatus(): Promise<{
    pending: number
    processing: number
    failed: number
  }> {
    const [pending, processing, failed] = await Promise.all([
      KV.zcard?.(this.QUEUE_KEY) || 0,
      KV.scard?.(this.PROCESSING_KEY) || 0,
      KV.keys?.('email:failed:*').then(keys => keys?.length || 0) || 0
    ])

    return { pending, processing, failed }
  }

  /**
   * Clear entire queue (for testing/emergency)
   */
  static async clearQueue(): Promise<number> {
    const [queueCleared, processingCleared] = await Promise.all([
      KV.del(this.QUEUE_KEY),
      KV.del(this.PROCESSING_KEY)
    ])

    console.log(`🗑️ Cleared email queue: ${queueCleared + processingCleared} items removed`)
    return queueCleared + processingCleared
  }

  /**
   * Get failed emails for manual review
   */
  static async getFailedEmails(): Promise<QueuedEmail[]> {
    const failedKeys = await KV.keys('email:failed:*') || []
    const failedEmails: QueuedEmail[] = []

    for (const key of failedKeys) {
      const emailData = await KV.hgetall(key)
      if (emailData) {
        failedEmails.push(emailData as any)
      }
    }

    return failedEmails
  }

  /**
   * Retry failed email
   */
  static async retryFailedEmail(emailId: string): Promise<boolean> {
    const failedEmail = await KV.hgetall(`email:failed:${emailId}`)
    if (!failedEmail) return false

    // Reset attempts and re-add to queue
    failedEmail.attempts = 0
    failedEmail.scheduledFor = new Date().toISOString()

    const score = Date.now()
    await KV.zadd(this.QUEUE_KEY, score, JSON.stringify(failedEmail))
    await KV.del(`email:failed:${emailId}`)

    console.log(`🔄 Retrying failed email ${emailId}`)
    return true
  }
}