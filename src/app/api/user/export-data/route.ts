import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await Auth.getCurrentSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user data and subscription data
    const userData = await Auth.getUserById(session.id)
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get subscription data (if exists)
    let subscriptionData = null
    try {
      const subscriptionResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/subscription/status`, {
        headers: {
          'Cookie': `session=${session.id}` // Pass session for internal request
        }
      })
      if (subscriptionResponse.ok) {
        const subData = await subscriptionResponse.json()
        subscriptionData = subData.subscription
      }
    } catch (error) {
      // Subscription data not available
    }

    const exportData = {
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin,
        notificationsEnabled: userData.notificationsEnabled,
      },
      subscription: subscriptionData,
      exportDate: new Date().toISOString(),
      dataVersion: '1.0',
    }

    const response = new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="coinspree-export-${session.id}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to export data' },
      { status: 500 }
    )
  }
}