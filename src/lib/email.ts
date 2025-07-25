import { Resend } from 'resend'
import { get } from '@vercel/edge-config'
import { KV } from './kv'
import { StringUtils, DateUtils } from './utils'
import type {
  EmailTemplate,
  ATHNotificationData,
  User,
  EmailDeliveryLog,
  UnsubscribeToken,
} from '@/types'

// Initialize Resend client (conditional to avoid build errors)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'CoinSpree <notifications@urgent.coinspree.cc>',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@urgent.coinspree.cc',
}

/**
 * Send ATH notification email to a user
 */
export async function sendATHNotificationEmail(
  user: User,
  notificationData: ATHNotificationData
): Promise<{ success: boolean; error?: string; emailId?: string }> {
  try {
    // CRITICAL SECURITY CHECK: Verify user eligibility before sending
    // Admin users should NEVER receive ATH notifications
    if (user.role === 'admin') {
      console.log(`🚫 BLOCKED: Admin user ${user.email} attempted to receive ATH notification`)
      return { success: false, error: 'Admin users cannot receive ATH notifications' }
    }

    // Verify user has notifications enabled
    if (!user.notificationsEnabled || !user.isActive) {
      console.log(`🚫 BLOCKED: User ${user.email} - notifications disabled or inactive`)
      return { success: false, error: 'User notifications disabled or account inactive' }
    }

    // CRITICAL: Verify active subscription before sending
    const subscription = await KV.getUserSubscription(user.id)
    if (!subscription || subscription.status !== 'active') {
      console.log(`🚫 BLOCKED: User ${user.email} - no active subscription (status: ${subscription?.status || 'none'})`)
      return { success: false, error: 'Active subscription required for ATH notifications' }
    }

    // Verify subscription is not expired
    const now = new Date()
    const endDate = new Date(subscription.endDate)
    if (now > endDate) {
      console.log(`🚫 BLOCKED: User ${user.email} - subscription expired on ${endDate.toISOString()}`)
      return { success: false, error: 'Subscription expired' }
    }

    // Check if Resend is configured
    if (!resend) {
      console.warn('Resend API key not configured, skipping email send')
      return { success: false, error: 'Email service not configured' }
    }

    // Get unsubscribe token for user
    const unsubscribeToken = await getOrCreateUnsubscribeToken(user.id)

    // Get ATH notification template from Edge Config
    const template = await getEmailTemplate('ath-notification')

    // Generate email content with unsubscribe token
    const { subject, html, text } = generateATHEmailContent(
      template,
      notificationData,
      unsubscribeToken
    )

    // Create email delivery log
    const emailId = StringUtils.generateId(16)
    const deliveryLog: EmailDeliveryLog = {
      id: emailId,
      userId: user.id,
      emailType: 'ath-notification',
      recipientEmail: user.email,
      subject,
      status: 'sent',
      sentAt: DateUtils.getCurrentISOString(),
    }

    // Send email via Resend
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: user.email,
      subject,
      html,
      text,
      reply_to: EMAIL_CONFIG.replyTo,
      tags: [
        { name: 'type', value: 'ath-notification' },
        { name: 'crypto', value: notificationData.symbol },
      ],
    })

    if (result.error) {
      console.error('Failed to send ATH notification email:', result.error)
      deliveryLog.status = 'failed'
      
      // Enhanced error message extraction from Resend API error objects
      let errorMessage = 'Email sending failed'
      if (typeof result.error === 'string') {
        errorMessage = result.error
      } else if (result.error && typeof result.error === 'object') {
        if (result.error.message && typeof result.error.message === 'string') {
          errorMessage = result.error.message
        } else if (result.error.error && typeof result.error.error === 'string') {
          errorMessage = result.error.error
        } else if (result.error.statusCode) {
          errorMessage = `Email API Error ${result.error.statusCode}: ${result.error.error || JSON.stringify(result.error)}`
        } else {
          errorMessage = JSON.stringify(result.error)
        }
      }
      
      deliveryLog.errorMessage = errorMessage
      await KV.saveEmailDeliveryLog(deliveryLog)
      return { success: false, error: errorMessage }
    }

    // Update delivery log with Resend ID
    deliveryLog.resendId = result.data?.id
    await KV.saveEmailDeliveryLog(deliveryLog)

    // Track email delivery for analytics
    await trackEmailDeliveryAnalytics(emailId, user.id, 'ath-notification', user.email, 'sent', {
      cryptoSymbol: notificationData.symbol,
      resendId: result.data?.id
    })

    console.log(
      `ATH notification sent to ${user.email} for ${notificationData.symbol}`
    )
    return { success: true, emailId }
  } catch (error) {
    console.error('Error sending ATH notification email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
  user: User
): Promise<{ success: boolean; error?: string; emailId?: string }> {
  try {
    // Check if Resend is configured
    if (!resend) {
      console.warn('Resend API key not configured, skipping email send')
      return { success: false, error: 'Email service not configured' }
    }

    // Get unsubscribe token for user
    const unsubscribeToken = await getOrCreateUnsubscribeToken(user.id)

    const template = await getEmailTemplate('welcome')

    const { subject, html, text } = generateWelcomeEmailContent(
      template,
      user,
      unsubscribeToken
    )

    // Create email delivery log
    const emailId = StringUtils.generateId(16)
    const deliveryLog: EmailDeliveryLog = {
      id: emailId,
      userId: user.id,
      emailType: 'welcome',
      recipientEmail: user.email,
      subject,
      status: 'sent',
      sentAt: DateUtils.getCurrentISOString(),
    }

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: user.email,
      subject,
      html,
      text,
      reply_to: EMAIL_CONFIG.replyTo,
      tags: [{ name: 'type', value: 'welcome' }],
    })

    if (result.error) {
      console.error('Failed to send welcome email:', result.error)
      deliveryLog.status = 'failed'
      deliveryLog.errorMessage = result.error.message || result.error.toString() || 'Email sending failed'
      await KV.saveEmailDeliveryLog(deliveryLog)
      
      // Track failed email delivery for analytics
      await trackEmailDeliveryAnalytics(emailId, user.id, 'welcome', user.email, 'failed', {
        errorMessage: deliveryLog.errorMessage,
        resendId: result.data?.id
      })
      
      return { success: false, error: deliveryLog.errorMessage }
    }

    // Update delivery log with Resend ID
    deliveryLog.resendId = result.data?.id
    await KV.saveEmailDeliveryLog(deliveryLog)
    
    // Track successful email delivery for analytics
    await trackEmailDeliveryAnalytics(emailId, user.id, 'welcome', user.email, 'sent', {
      resendId: result.data?.id
    })

    return { success: true, emailId }
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send subscription expiry warning email
 */
export async function sendSubscriptionExpiryEmail(
  user: User,
  daysUntilExpiry: number
): Promise<{ success: boolean; error?: string; emailId?: string }> {
  try {
    // Check if Resend is configured
    if (!resend) {
      console.warn('Resend API key not configured, skipping email send')
      return { success: false, error: 'Email service not configured' }
    }

    // Get unsubscribe token for user
    const unsubscribeToken = await getOrCreateUnsubscribeToken(user.id)

    const template = await getEmailTemplate('subscription-expiry')

    const { subject, html, text } = generateSubscriptionExpiryEmailContent(
      template,
      user,
      daysUntilExpiry,
      unsubscribeToken
    )

    // Create email delivery log
    const emailId = StringUtils.generateId(16)
    const deliveryLog: EmailDeliveryLog = {
      id: emailId,
      userId: user.id,
      emailType: 'subscription-expiry',
      recipientEmail: user.email,
      subject,
      status: 'sent',
      sentAt: DateUtils.getCurrentISOString(),
    }

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: user.email,
      subject,
      html,
      text,
      reply_to: EMAIL_CONFIG.replyTo,
      tags: [{ name: 'type', value: 'subscription-expiry' }],
    })

    if (result.error) {
      console.error('Failed to send subscription expiry email:', result.error)
      deliveryLog.status = 'failed'
      deliveryLog.errorMessage = result.error.message || result.error.toString() || 'Email sending failed'
      await KV.saveEmailDeliveryLog(deliveryLog)
      
      // Track failed email delivery for analytics
      await trackEmailDeliveryAnalytics(emailId, user.id, 'subscription-expiry', user.email, 'failed', {
        daysUntilExpiry,
        errorMessage: deliveryLog.errorMessage,
        resendId: result.data?.id
      })
      
      return { success: false, error: deliveryLog.errorMessage }
    }

    // Update delivery log with Resend ID
    deliveryLog.resendId = result.data?.id
    await KV.saveEmailDeliveryLog(deliveryLog)
    
    // Track successful email delivery for analytics
    await trackEmailDeliveryAnalytics(emailId, user.id, 'subscription-expiry', user.email, 'sent', {
      daysUntilExpiry,
      resendId: result.data?.id
    })

    return { success: true, emailId }
  } catch (error) {
    console.error('Error sending subscription expiry email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  user: User,
  resetToken: string
): Promise<{ success: boolean; error?: string; emailId?: string }> {
  try {
    // Check if Resend is configured
    if (!resend) {
      console.warn('Resend API key not configured, skipping email send')
      return { success: false, error: 'Email service not configured' }
    }

    const template = await getEmailTemplate('password-reset')

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`
    const { subject, html, text } = generatePasswordResetEmailContent(
      template,
      user,
      resetUrl
    )

    // Create email delivery log
    const emailId = StringUtils.generateId(16)
    const deliveryLog: EmailDeliveryLog = {
      id: emailId,
      userId: user.id,
      emailType: 'password-reset',
      recipientEmail: user.email,
      subject,
      status: 'sent',
      sentAt: DateUtils.getCurrentISOString(),
    }

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: user.email,
      subject,
      html,
      text,
      reply_to: EMAIL_CONFIG.replyTo,
      tags: [{ name: 'type', value: 'password-reset' }],
    })

    if (result.error) {
      console.error('Failed to send password reset email:', result.error)
      deliveryLog.status = 'failed'
      deliveryLog.errorMessage = result.error.message || result.error.toString() || 'Email sending failed'
      await KV.saveEmailDeliveryLog(deliveryLog)
      
      // Track failed email delivery for analytics
      await trackEmailDeliveryAnalytics(emailId, user.id, 'password-reset', user.email, 'failed', {
        resetToken,
        errorMessage: deliveryLog.errorMessage,
        resendId: result.data?.id
      })
      
      return { success: false, error: deliveryLog.errorMessage }
    }

    // Update delivery log with Resend ID
    deliveryLog.resendId = result.data?.id
    await KV.saveEmailDeliveryLog(deliveryLog)
    
    // Track successful email delivery for analytics
    await trackEmailDeliveryAnalytics(emailId, user.id, 'password-reset', user.email, 'sent', {
      resetToken,
      resendId: result.data?.id
    })

    return { success: true, emailId }
  } catch (error) {
    console.error('Error sending password reset email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send test notification email
 */
export async function sendTestNotificationEmail(
  user: User
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create test ATH data
    const testData: ATHNotificationData = {
      cryptoName: 'Bitcoin',
      symbol: 'BTC',
      newATH: 50000,
      previousATH: 48000,
      percentageIncrease: 4.17,
      athDate: new Date().toISOString(),
    }

    return await sendATHNotificationEmail(user, testData)
  } catch (error) {
    console.error('Error sending test notification email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Email template generators
function generateATHEmailContent(
  template: EmailTemplate,
  data: ATHNotificationData,
  unsubscribeToken: string
): EmailTemplate {
  const percentageFormatted = (data.percentageIncrease || 0).toFixed(2)
  const priceFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(data.newATH)

  const previousPriceFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(data.previousATH)

  const replacements = {
    '{{cryptoName}}': data.cryptoName,
    '{{symbol}}': data.symbol,
    '{{newATH}}': priceFormatted,
    '{{previousATH}}': previousPriceFormatted,
    '{{percentageIncrease}}': percentageFormatted,
    '{{athDate}}': new Date(data.athDate).toLocaleString(),
    '{{unsubscribeToken}}': unsubscribeToken,
  }

  return {
    subject: replaceTemplateVariables(template.subject, replacements),
    html: replaceTemplateVariables(template.html, replacements),
    text: replaceTemplateVariables(template.text, replacements),
  }
}

function generateWelcomeEmailContent(
  template: EmailTemplate,
  user: User,
  unsubscribeToken: string
): EmailTemplate {
  const replacements = {
    '{{email}}': user.email,
    '{{dashboardUrl}}': `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    '{{subscriptionUrl}}': `${process.env.NEXT_PUBLIC_APP_URL}/subscription`,
    '{{notificationsUrl}}': `${process.env.NEXT_PUBLIC_APP_URL}/notifications`,
    '{{unsubscribeUrl}}': `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?token=${unsubscribeToken}`,
  }

  return {
    subject: replaceTemplateVariables(template.subject, replacements),
    html: replaceTemplateVariables(template.html, replacements),
    text: replaceTemplateVariables(template.text, replacements),
  }
}

function generateSubscriptionExpiryEmailContent(
  template: EmailTemplate,
  user: User,
  daysUntilExpiry: number,
  unsubscribeToken: string
): EmailTemplate {
  const replacements = {
    '{{email}}': user.email,
    '{{daysUntilExpiry}}': daysUntilExpiry.toString(),
    '{{renewUrl}}': `${process.env.NEXT_PUBLIC_APP_URL}/subscription`,
    '{{unsubscribeUrl}}': `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?token=${unsubscribeToken}`,
  }

  return {
    subject: replaceTemplateVariables(template.subject, replacements),
    html: replaceTemplateVariables(template.html, replacements),
    text: replaceTemplateVariables(template.text, replacements),
  }
}

function generatePasswordResetEmailContent(
  template: EmailTemplate,
  user: User,
  resetUrl: string
): EmailTemplate {
  const replacements = {
    '{{email}}': user.email,
    '{{resetUrl}}': resetUrl,
  }

  return {
    subject: replaceTemplateVariables(template.subject, replacements),
    html: replaceTemplateVariables(template.html, replacements),
    text: replaceTemplateVariables(template.text, replacements),
  }
}

// Utility functions
function replaceTemplateVariables(
  template: string,
  replacements: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key, 'g'), value)
  }
  return result
}

/**
 * Get email template from Edge Config
 */
async function getEmailTemplate(templateName: string): Promise<EmailTemplate> {
  try {
    const template = (await get(
      `email-template-${templateName}`
    )) as EmailTemplate

    if (!template) {
      // Fallback to default templates if Edge Config is not available
      return getDefaultEmailTemplate(templateName)
    }

    return template
  } catch (error) {
    console.warn(`Failed to get email template from Edge Config: ${error}`)
    return getDefaultEmailTemplate(templateName)
  }
}

/**
 * Default email templates (fallback when Edge Config is unavailable)
 */
function getDefaultEmailTemplate(templateName: string): EmailTemplate {
  const templates: Record<string, EmailTemplate> = {
    'ath-notification': {
      subject: '🚀 {{cryptoName}} ({{symbol}}) Hit New All-Time High!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(90deg, #f59e0b, #ef4444); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🚀 New All-Time High Alert!</h1>
          </div>
          <div style="padding: 20px; background-color: #f9fafb;">
            <h2 style="color: #1f2937;">{{cryptoName}} ({{symbol}}) Reached {{newATH}}</h2>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>New ATH:</strong> {{newATH}}</p>
              <p><strong>Previous ATH:</strong> {{previousATH}}</p>
              <p><strong>Increase:</strong> +{{percentageIncrease}}%</p>
              <p><strong>Time:</strong> {{athDate}}</p>
            </div>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Dashboard
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              This notification was sent because you have an active subscription to CoinSpree notifications.
            </p>
          </div>
        </div>
      `,
      text: `🚀 {{cryptoName}} ({{symbol}}) Hit New All-Time High!\n\nNew ATH: {{newATH}}\nPrevious ATH: {{previousATH}}\nIncrease: +{{percentageIncrease}}%\nTime: {{athDate}}\n\nView your dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    },
    welcome: {
      subject: 'Welcome to CoinSpree - Never Miss an All-Time High Again!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #3b82f6; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to CoinSpree! 🚀</h1>
          </div>
          <div style="padding: 20px;">
            <p>Hi there!</p>
            <p>Welcome to CoinSpree! Your account has been successfully created and you're now ready to never miss another all-time high.</p>
            <h3>What's Next?</h3>
            <ol>
              <li>Visit your <a href="{{dashboardUrl}}">dashboard</a> to see the top 100 cryptocurrencies</li>
              <li>Set up a <a href="{{subscriptionUrl}}">subscription</a> to receive ATH notifications</li>
              <li>Customize your notification preferences</li>
            </ol>
            <div style="text-align: center; margin: 20px 0;">
              <a href="{{dashboardUrl}}" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Go to Dashboard
              </a>
            </div>
            <p>Happy trading!</p>
            <p>The CoinSpree Team</p>
          </div>
        </div>
      `,
      text: `Welcome to CoinSpree!\n\nYour account has been successfully created. Visit your dashboard: {{dashboardUrl}}\n\nSet up notifications: {{subscriptionUrl}}`,
    },
    'subscription-expiry': {
      subject:
        'Your CoinSpree Subscription Expires in {{daysUntilExpiry}} Days',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f59e0b; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">⚠️ Subscription Expiring Soon</h1>
          </div>
          <div style="padding: 20px;">
            <p>Hi {{email}},</p>
            <p>Your CoinSpree subscription will expire in <strong>{{daysUntilExpiry}} days</strong>.</p>
            <p>Don't miss out on crucial ATH notifications! Renew your subscription to continue receiving real-time alerts when cryptocurrencies hit new all-time highs.</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="{{renewUrl}}" 
                 style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Renew Subscription
              </a>
            </div>
            <p>Thank you for using CoinSpree!</p>
          </div>
        </div>
      `,
      text: `Your CoinSpree subscription expires in {{daysUntilExpiry}} days. Renew now: {{renewUrl}}`,
    },
    'password-reset': {
      subject: 'Reset Your CoinSpree Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #6366f1; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Password Reset Request</h1>
          </div>
          <div style="padding: 20px;">
            <p>Hi {{email}},</p>
            <p>We received a request to reset your password for your CoinSpree account.</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="{{resetUrl}}" 
                 style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
          </div>
        </div>
      `,
      text: `Reset your CoinSpree password: {{resetUrl}}\n\nThis link expires in 1 hour.`,
    },
  }

  const template = templates[templateName]
  if (!template) {
    throw new Error(`Email template '${templateName}' not found`)
  }

  return template
}

/**
 * Queue system for bulk email sending
 */
export class EmailQueue {
  private queue: Array<{
    user: User
    data: ATHNotificationData
    retries: number
  }> = []

  private maxRetries = 3
  private processing = false

  async addATHNotification(
    user: User,
    data: ATHNotificationData
  ): Promise<void> {
    this.queue.push({ user, data, retries: 0 })

    if (!this.processing) {
      await this.processQueue()
    }
  }

  // Development method to clear queue
  clearQueue(): number {
    const count = this.queue.length
    this.queue = []
    this.processing = false
    console.log(`🗑️ Email queue cleared: ${count} notifications removed`)
    return count
  }

  // Get queue status
  getQueueStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.queue.length,
      processing: this.processing
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return

    this.processing = true

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, 10) // Process 10 emails at a time

      await Promise.allSettled(
        batch.map(async (item) => {
          const result = await sendATHNotificationEmail(item.user, item.data)

          if (!result.success && item.retries < this.maxRetries) {
            // Re-queue for retry
            this.queue.push({ ...item, retries: item.retries + 1 })
          }
        })
      )

      // Small delay between batches to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    this.processing = false
  }
}

// Helper functions for unsubscribe tokens
async function getOrCreateUnsubscribeToken(userId: string): Promise<string> {
  // Check if user already has an unsubscribe token
  const existingToken = await KV.getUserUnsubscribeToken(userId)
  if (existingToken) {
    return existingToken
  }

  // Create new unsubscribe token
  const token = StringUtils.generateId(32)
  const unsubscribeToken: UnsubscribeToken = {
    id: StringUtils.generateId(16),
    userId,
    token,
    createdAt: DateUtils.getCurrentISOString(),
    expiresAt: DateUtils.addDays(new Date(), 365).toISOString(), // 1 year
  }

  await KV.createUnsubscribeToken(unsubscribeToken)
  return token
}

// Email delivery tracking for KV database updates
export async function trackEmailDelivery(
  emailId: string,
  status: EmailDeliveryLog['status'],
  errorMessage?: string
): Promise<void> {
  try {
    const deliveredAt =
      status === 'delivered' ? DateUtils.getCurrentISOString() : undefined
    await KV.updateEmailDeliveryStatus(
      emailId,
      status,
      deliveredAt,
      errorMessage
    )
  } catch (error) {
    console.error('Failed to track email delivery:', error)
  }
}

// Email delivery analytics tracking
export async function trackEmailDeliveryAnalytics(
  emailId: string,
  userId: string,
  emailType: string,
  recipientEmail: string,
  status: 'sent' | 'delivered' | 'failed' | 'bounced',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Send analytics event to the email analytics API endpoint
    const analyticsData = {
      emailId,
      userId,
      emailType,
      recipientEmail,
      deliveryTime: Date.now(),
      status,
      errorMessage: metadata?.errorMessage,
      bounced: status === 'bounced',
      opened: false, // Will be updated by webhook if available
      clicked: false, // Will be updated by webhook if available
      metadata
    }

    // Make internal API call to record analytics
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/email-analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analyticsData)
    })

    if (!response.ok) {
      console.warn('Failed to record email analytics:', await response.text())
    }

    console.log(`📧 Email analytics tracked: ${emailType} ${status} for ${recipientEmail}`)
    
  } catch (error) {
    console.error('❌ Failed to track email delivery analytics:', error)
    // Don't throw error to avoid breaking email sending flow
  }
}

// Global email queue instance
export const emailQueue = new EmailQueue()
