import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notifications'
import { validateSession } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updatePreferencesSchema = z.object({
  notificationsEnabled: z.boolean(),
})

export async function GET(request: NextRequest) {
  try {
    // Validate session
    const session = await validateSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user preferences
    const user = await KV.getUser(session.userId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        notificationsEnabled: user.notificationsEnabled,
        userId: user.id,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Failed to get notification preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Validate session
    const session = await validateSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { notificationsEnabled } = updatePreferencesSchema.parse(body)

    // Update notification preferences
    const result = await NotificationService.updateNotificationPreferences(
      session.userId,
      notificationsEnabled
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        notificationsEnabled,
        message: `Notifications ${notificationsEnabled ? 'enabled' : 'disabled'} successfully`,
      },
    })
  } catch (error) {
    console.error('Failed to update notification preferences:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
