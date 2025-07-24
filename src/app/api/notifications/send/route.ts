import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notifications'
import { validateSession } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { z } from 'zod'

const sendNotificationSchema = z.object({
  cryptoId: z.string().min(1),
  userIds: z.array(z.string()).optional(), // If specified, send only to these users
})

export async function POST(request: NextRequest) {
  try {
    // Validate session and require admin role
    const session = await validateSession(request)
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { cryptoId } = sendNotificationSchema.parse(body)

    // Get crypto data
    const crypto = await KV.getCrypto(cryptoId)
    if (!crypto) {
      return NextResponse.json(
        { success: false, error: 'Cryptocurrency not found' },
        { status: 404 }
      )
    }

    // Create a manual notification log
    const notificationLog = {
      id: `manual-${Date.now()}`,
      cryptoId,
      newATH: crypto.currentPrice,
      previousATH: crypto.ath,
      sentAt: new Date().toISOString(),
      recipientCount: 0,
    }

    await KV.saveNotificationLog(notificationLog)

    // Send notifications
    const result = await NotificationService.sendATHNotifications(
      crypto,
      crypto.ath,
      notificationLog
    )

    return NextResponse.json({
      success: true,
      data: {
        notificationId: notificationLog.id,
        recipientCount: result.recipientCount,
        errors: result.errors,
      },
    })
  } catch (error) {
    console.error('Failed to send notification:', error)

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
      { success: false, error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
