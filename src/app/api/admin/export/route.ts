import { NextResponse } from 'next/server'
import { validateServerSession } from '@/lib/auth'
import { KV } from '@/lib/kv'

export const dynamic = 'force-dynamic'

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

    // Collect all system data
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        exportedBy: session.email,
        version: '1.0'
      },
      users: [] as any[],
      subscriptions: [] as any[],
      cryptoAssets: [] as any[],
      notifications: [] as any[]
    }

    // Get all users (excluding sensitive data like passwords)
    const allUsers = await KV.getAllSafeUsers()
    exportData.users = allUsers.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      notificationsEnabled: user.notificationsEnabled
      // passwordHash is automatically excluded by getAllSafeUsers()
    }))

    // Get all subscriptions
    const allSubscriptionIds = [
      ...(await KV['smembers']?.('subscriptions:active') || []),
      ...(await KV['smembers']?.('subscriptions:pending') || []),
      ...(await KV['smembers']?.('subscriptions:expired') || []),
      ...(await KV['smembers']?.('subscriptions:blocked') || [])
    ]

    for (const id of allSubscriptionIds) {
      try {
        const subscription = await KV.getSubscriptionById(id as string)
        if (subscription) {
          exportData.subscriptions.push({
            id: subscription.id,
            userId: subscription.userId,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            amount: subscription.amount,
            paymentTxHash: subscription.paymentTxHash,
            createdAt: subscription.createdAt
          })
        }
      } catch (error) {
        console.error('Error exporting subscription:', id, error)
      }
    }

    // Get crypto assets data (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    try {
      const cryptoKeys = await KV['keys']?.('crypto:*') || []
      for (const key of cryptoKeys.slice(0, 20)) { // Limit to prevent huge exports
        try {
          const cryptoData = await KV['hgetall']?.(key as string) as any
          if (cryptoData && cryptoData.lastUpdated && new Date(cryptoData.lastUpdated) > weekAgo) {
            exportData.cryptoAssets.push({
              id: cryptoData.id || '',
              symbol: cryptoData.symbol || '',
              name: cryptoData.name || '',
              currentPrice: parseFloat(cryptoData.currentPrice || '0'),
              ath: parseFloat(cryptoData.ath || '0'),
              athDate: cryptoData.athDate || '',
              lastUpdated: cryptoData.lastUpdated || ''
            })
          }
        } catch (error) {
          console.error('Error exporting crypto asset:', key, error)
        }
      }
    } catch (error) {
      console.error('Error getting crypto keys:', error)
    }

    // Get recent notifications (last 7 days)
    try {
      const recentNotifications = await KV.getNotificationsSince(weekAgo.toISOString())
      exportData.notifications = recentNotifications.slice(0, 50).map(notification => ({
        id: notification.id,
        cryptoId: notification.cryptoId,
        newATH: notification.newATH,
        previousATH: notification.previousATH,
        sentAt: notification.sentAt,
        recipientCount: notification.recipientCount
      }))
    } catch (error) {
      console.error('Error exporting notifications:', error)
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `coinspree-admin-export-${timestamp}.json`

    // Return JSON file download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('Admin export error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export data' },
      { status: 500 }
    )
  }
}