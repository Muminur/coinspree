import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { emailQueue } from '@/lib/email'
import { StringUtils, DateUtils } from '@/lib/utils'
import { z } from 'zod'
import type { ATHNotificationData, NotificationLog } from '@/types'

const bulkNotificationSchema = z.object({
  cryptoId: z.string().min(1),
  userIds: z.array(z.string()).optional(), // If not provided, send to all eligible users
  customMessage: z.string().optional(), // Override the standard ATH message
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
    const { cryptoId, userIds, customMessage } =
      bulkNotificationSchema.parse(body)

    // Get crypto data
    const crypto = await KV.getCrypto(cryptoId)
    if (!crypto) {
      return NextResponse.json(
        { success: false, error: 'Cryptocurrency not found' },
        { status: 404 }
      )
    }

    // Get target users
    let targetUsers
    if (userIds && userIds.length > 0) {
      // Send to specific users
      const users = await Promise.all(userIds.map((id) => KV.getUser(id)))
      targetUsers = users.filter((user) => user !== null)
    } else {
      // Send to all users with active subscriptions and notifications enabled
      const allUsers = await KV.getAllUsers()
      targetUsers = []

      for (const user of allUsers) {
        if (!user.notificationsEnabled || !user.isActive) {
          continue
        }

        const subscription = await KV.getUserSubscription(user.id)
        if (!subscription || subscription.status !== 'active') {
          continue
        }

        // Check if subscription is not expired
        const now = new Date()
        const endDate = new Date(subscription.endDate)
        if (now <= endDate) {
          targetUsers.push(user)
        }
      }
    }

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No eligible users found' },
        { status: 400 }
      )
    }

    // Create notification data
    const notificationData: ATHNotificationData = {
      cryptoName: crypto.name,
      symbol: crypto.symbol,
      newATH: crypto.currentPrice,
      previousATH: crypto.ath,
      percentageIncrease:
        ((crypto.currentPrice - crypto.ath) / crypto.ath) * 100,
      athDate: crypto.lastUpdated,
    }

    // If custom message provided, modify the notification
    if (customMessage) {
      notificationData.cryptoName = `${crypto.name} - ADMIN ALERT`
    }

    // Create notification log for tracking
    const notificationLog: NotificationLog = {
      id: `admin-${StringUtils.generateId(16)}`,
      cryptoId,
      newATH: crypto.currentPrice,
      previousATH: crypto.ath,
      sentAt: DateUtils.getCurrentISOString(),
      recipientCount: 0, // Will be updated after sending
    }

    await KV.saveNotificationLog(notificationLog)

    // Queue emails for all target users
    const errors: string[] = []
    let queuedCount = 0

    for (const user of targetUsers) {
      try {
        await emailQueue.addATHNotification(user, notificationData)
        queuedCount++
      } catch (error) {
        const errorMsg = `Failed to queue notification for ${user.email}: ${error}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    // Update notification log with queued count
    await KV.updateNotificationRecipientCount(notificationLog.id, queuedCount)

    console.log(
      `Admin bulk notification queued for ${queuedCount}/${targetUsers.length} users: ${crypto.symbol}`
    )

    return NextResponse.json({
      success: true,
      data: {
        notificationId: notificationLog.id,
        cryptoSymbol: crypto.symbol,
        targetUsers: targetUsers.length,
        queuedCount,
        errors,
        customMessage: customMessage || null,
      },
    })
  } catch (error) {
    console.error('Failed to send bulk notification:', error)

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
      { success: false, error: 'Failed to send bulk notification' },
      { status: 500 }
    )
  }
}

// Get bulk notification statistics
export async function GET(request: NextRequest) {
  try {
    // Validate session and require admin role
    const session = await validateSession(request)
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 401 }
      )
    }

    // Get recent admin notifications (last 30 days)
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString()
    const allNotifications = await KV.getNotificationsSince(thirtyDaysAgo)

    // Filter admin notifications
    const adminNotifications = allNotifications.filter((n) =>
      n.id.startsWith('admin-')
    )

    // Calculate statistics
    const totalBulkNotifications = adminNotifications.length
    const totalRecipients = adminNotifications.reduce(
      (sum, n) => sum + n.recipientCount,
      0
    )
    const averageRecipientsPerNotification =
      totalBulkNotifications > 0
        ? Math.round((totalRecipients / totalBulkNotifications) * 100) / 100
        : 0

    // Get recent notifications with details
    const recentNotifications = adminNotifications
      .slice(0, 10)
      .map((notification) => ({
        id: notification.id,
        cryptoId: notification.cryptoId,
        recipientCount: notification.recipientCount,
        sentAt: notification.sentAt,
      }))

    return NextResponse.json({
      success: true,
      data: {
        statistics: {
          totalBulkNotifications,
          totalRecipients,
          averageRecipientsPerNotification,
        },
        recentNotifications,
      },
    })
  } catch (error) {
    console.error('Failed to get bulk notification statistics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get statistics' },
      { status: 500 }
    )
  }
}
