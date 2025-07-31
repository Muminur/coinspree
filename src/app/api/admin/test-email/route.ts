import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'
import { KV } from '@/lib/kv'

export async function POST(request: NextRequest) {
  try {
    // Validate admin session
    const session = await validateSession(request)
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // First check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Email service not configured - RESEND_API_KEY missing'
      }, { status: 500 })
    }

    // Send a simple test email to the admin
    const testUser = {
      email: session.email,
      id: session.userId,
      createdAt: new Date().toISOString()
    }

    console.log('🔔 Admin email service test - sending welcome email to:', session.email)
    
    // Try to send a welcome email as test
    await sendWelcomeEmail(testUser)
    
    console.log('📬 Test email sent successfully to admin:', session.email)

    return NextResponse.json({
      success: true,
      data: {
        message: 'Test email sent successfully to admin',
        email: session.email,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Admin email test failed:', error)
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to send test email'
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}