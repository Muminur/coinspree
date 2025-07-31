import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, AuthMiddleware } from '@/lib/auth-middleware'
import { KV } from '@/lib/kv'

export const dynamic = 'force-dynamic'

export const GET = withAdminAuth(async (request: NextRequest, auth) => {
  try {

    // Get all users with enhanced information
    const allUsers = await KV.getAllUsers()
    
    // Check subscription status for each user and update notification preferences
    const usersWithSubscriptionStatus = await Promise.all(
      allUsers.map(async (user) => {
        // Check if user has an active subscription
        const subscription = await KV.getUserSubscription(user.id)
        const hasActiveSubscription = subscription && subscription.status === 'active' && new Date(subscription.endDate) > new Date()
        
        // Automatically set notification preferences based on subscription status
        // Admin users and non-subscribers should have notifications disabled
        const shouldEnableNotifications = Boolean(hasActiveSubscription && user.role !== 'admin')
        
        // Update the user's notification preference if it doesn't match the subscription status
        if (user.notificationsEnabled !== shouldEnableNotifications) {
          await KV.updateUser(user.id, { notificationsEnabled: shouldEnableNotifications })
          user.notificationsEnabled = shouldEnableNotifications
        }
        
        // Calculate subscription details
        const hasSubscription = !!subscription
        const isSubscribed = hasActiveSubscription
        const daysRemaining = hasActiveSubscription && subscription
          ? Math.ceil((new Date(subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : 0

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          notificationsEnabled: user.notificationsEnabled,
          // Enhanced subscription information
          hasSubscription,
          isSubscribed,
          subscriptionStatus: subscription?.status || 'none',
          subscriptionEndDate: subscription?.endDate || null,
          daysRemaining,
          subscriptionAmount: subscription?.amount || null
        }
      })
    )
    
    // Sort users by creation date (newest first)
    const sortedUsers = usersWithSubscriptionStatus
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return AuthMiddleware.createSuccessResponse({
      users: sortedUsers,
      total: sortedUsers.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin users GET error:', error)
    return AuthMiddleware.createErrorResponse(error, 500, 'Failed to fetch users')
  }
})