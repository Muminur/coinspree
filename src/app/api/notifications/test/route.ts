import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notifications'
import { validateSession } from '@/lib/auth'
import { KV } from '@/lib/kv'

export async function POST(request: NextRequest) {
  try {
    // Validate session
    const session = await validateSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has active subscription
    const subscription = await KV.getUserSubscription(session.userId)
    if (!subscription || subscription.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: 'Active subscription required to send test notifications',
        },
        { status: 403 }
      )
    }

    // Check if subscription is not expired
    const now = new Date()
    const endDate = new Date(subscription.endDate)
    if (now > endDate) {
      return NextResponse.json(
        { success: false, error: 'Subscription has expired' },
        { status: 403 }
      )
    }

    // Send test notification
    console.log('🔔 Calling NotificationService.sendTestNotification for user:', session.userId)
    
    const result = await NotificationService.sendTestNotification(
      session.userId
    )
    
    console.log('📬 NotificationService result:', result)

    if (!result.success) {
      // Ensure error is always a string
      let errorMessage = 'Failed to send test notification'
      
      if (typeof result.error === 'string') {
        errorMessage = result.error
      } else if (result.error && typeof result.error === 'object') {
        errorMessage = result.error.message || JSON.stringify(result.error) || errorMessage
      }
      
      console.log('Test notification failed:', { originalError: result.error, finalError: errorMessage })
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Test notification sent successfully',
        email: session.email || 'your email',
      },
    })
  } catch (error) {
    // Ensure error is always a string
    let errorMessage = 'Failed to send test notification'
    
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object') {
      errorMessage = (error as any).message || JSON.stringify(error) || errorMessage
    }
    
    console.error('Test notification API error:', { originalError: error, finalError: errorMessage })
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
