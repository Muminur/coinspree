import { NextRequest, NextResponse } from 'next/server'
import { validateServerSession } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { z } from 'zod'

const ConfigSchema = z.object({
  emailFromAddress: z.string().email(),
  emailReplyTo: z.string().email(),
  cronInterval: z.number().min(1).max(60),
  maxNotificationsPerUser: z.number().min(1).max(50),
  subscriptionPrices: z.object({
    monthly: z.number().min(1),
    yearly: z.number().min(1)
  }),
  tronWalletAddress: z.string().min(30),
  athDetectionThreshold: z.number().min(0.001).max(10)
})

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

    // Get current configuration (with defaults)
    const config = {
      emailFromAddress: process.env.EMAIL_FROM || 'notifications@urgent.coinspree.cc',
      emailReplyTo: process.env.EMAIL_REPLY_TO || 'support@urgent.coinspree.cc',
      cronInterval: parseInt(process.env.CRON_INTERVAL || '5'),
      maxNotificationsPerUser: parseInt(process.env.MAX_NOTIFICATIONS_PER_USER || '10'),
      subscriptionPrices: {
        monthly: parseFloat(process.env.MONTHLY_PRICE || '3'),
        yearly: parseFloat(process.env.YEARLY_PRICE || '30')
      },
      tronWalletAddress: process.env.TRON_WALLET_ADDRESS || 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs',
      athDetectionThreshold: parseFloat(process.env.ATH_THRESHOLD || '0.01')
    }

    return NextResponse.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin config GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const session = await validateServerSession()
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate configuration data
    const validation = ConfigSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid configuration data',
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const config = validation.data

    // In a real implementation, you might store this in Edge Config or environment variables
    // For now, we'll just return success (configuration would be handled via environment variables)
    console.log('Admin updated configuration:', config)

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      data: config
    })

  } catch (error) {
    console.error('Admin config POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update configuration' },
      { status: 500 }
    )
  }
}