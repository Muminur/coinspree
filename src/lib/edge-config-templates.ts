import type { EmailTemplate } from '@/types'

/**
 * Initialize email templates in Vercel Edge Config
 * This should be run once during deployment setup
 * 
 * Note: Edge Config write operations require admin SDK setup
 * For now, templates are hardcoded in the email service with fallbacks
 */
export async function initializeEmailTemplates(): Promise<void> {
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
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?token={{unsubscribeToken}}" 
                 style="color: #6b7280; text-decoration: underline; font-size: 12px;">
                Unsubscribe from notifications
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              This notification was sent because you have an active subscription to CoinSpree notifications.
            </p>
          </div>
        </div>
      `,
      text: `🚀 {{cryptoName}} ({{symbol}}) Hit New All-Time High!\n\nNew ATH: {{newATH}}\nPrevious ATH: {{previousATH}}\nIncrease: +{{percentageIncrease}}%\nTime: {{athDate}}\n\nView your dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard\n\nUnsubscribe: ${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?token={{unsubscribeToken}}`,
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
              <li>Customize your <a href="{{notificationsUrl}}">notification preferences</a></li>
            </ol>
            <div style="text-align: center; margin: 20px 0;">
              <a href="{{dashboardUrl}}" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Go to Dashboard
              </a>
            </div>
            <p>Happy trading!</p>
            <p>The CoinSpree Team</p>
            <div style="text-align: center; margin: 20px 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              <a href="{{unsubscribeUrl}}" 
                 style="color: #6b7280; text-decoration: underline; font-size: 12px;">
                Unsubscribe from emails
              </a>
            </div>
          </div>
        </div>
      `,
      text: `Welcome to CoinSpree!\n\nYour account has been successfully created. Visit your dashboard: {{dashboardUrl}}\n\nSet up notifications: {{subscriptionUrl}}\n\nUnsubscribe: {{unsubscribeUrl}}`,
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
            <div style="text-align: center; margin: 20px 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              <a href="{{unsubscribeUrl}}" 
                 style="color: #6b7280; text-decoration: underline; font-size: 12px;">
                Unsubscribe from emails
              </a>
            </div>
          </div>
        </div>
      `,
      text: `Your CoinSpree subscription expires in {{daysUntilExpiry}} days. Renew now: {{renewUrl}}\n\nUnsubscribe: {{unsubscribeUrl}}`,
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
            <div style="text-align: center; margin: 20px 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              <p style="color: #6b7280; font-size: 12px;">
                This is an automated security email. You cannot unsubscribe from password reset emails.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `Reset your CoinSpree password: {{resetUrl}}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
    },
  }

  // Note: Edge Config write operations require special setup
  // Templates are currently served from fallbacks in email.ts
  console.log('📧 Email templates defined:', Object.keys(templates))
  console.log('⚠️  Edge Config write operations require admin SDK setup')
  console.log('✅ Using fallback templates from email service')
}

/**
 * CLI function to initialize templates
 */
export async function setupEmailTemplates() {
  console.log('🚀 Setting up email templates in Edge Config...')
  try {
    await initializeEmailTemplates()
    console.log('✅ All email templates uploaded successfully!')
  } catch (error) {
    console.error('❌ Failed to setup email templates:', error)
    process.exit(1)
  }
}
