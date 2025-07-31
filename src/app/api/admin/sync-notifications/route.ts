import { NextResponse } from 'next/server'
import { validateServerSession } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { SubscriptionLifecycle } from '@/lib/subscription-lifecycle'

export async function POST() {
  try {
    // Require admin authentication
    const session = await validateServerSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    console.log(`🔄 Notification sync triggered by admin ${session.email}`)
    
    // Get user counts before sync
    const allUsers = await KV.getAllUsers()
    const usersBefore = {
      total: allUsers.length,
      withNotifications: allUsers.filter(u => u.notificationsEnabled).length
    }

    // Sync all notification preferences
    await SubscriptionLifecycle.syncAllNotificationPreferences()

    // Get user counts after sync
    const allUsersAfter = await KV.getAllUsers()
    const usersAfter = {
      total: allUsersAfter.length,
      withNotifications: allUsersAfter.filter(u => u.notificationsEnabled).length
    }

    const result = {
      before: usersBefore,
      after: usersAfter,
      changed: usersBefore.withNotifications !== usersAfter.withNotifications
    }

    console.log(`✅ Notification sync completed:`, result)

    return NextResponse.json({
      success: true,
      message: 'Notification preferences synced successfully',
      data: result,
      syncedBy: user.email,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Notification sync error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync notification preferences' },
      { status: 500 }
    )
  }
}