import { NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { sendATHNotificationEmail } from '@/lib/email'
import type { ATHNotificationData } from '@/types'

export async function POST() {
  try {
    // Require admin authentication
    const session = await Auth.requireAuth()
    const user = await KV.getUserById(session.userId)
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const testResults = []
    const testData: ATHNotificationData = {
      cryptoName: 'Bitcoin',
      symbol: 'BTC',
      newATH: 50000,
      previousATH: 48000,
      percentageIncrease: 4.17,
      athDate: new Date().toISOString(),
    }

    // Test 1: Try to send to admin user (should be blocked)
    console.log('🧪 Test 1: Admin user email protection')
    const adminResult = await sendATHNotificationEmail(user, testData)
    testResults.push({
      test: 'Admin User Protection',
      blocked: !adminResult.success,
      error: adminResult.error,
      expected: 'Should be blocked',
      result: adminResult.success ? '❌ SECURITY FLAW: Admin received email!' : '✅ Correctly blocked'
    })

    // Test 2: Try to send to non-subscriber
    console.log('🧪 Test 2: Non-subscriber protection')
    const allUsers = await KV.getAllUsers()
    const nonSubscriber = allUsers.find(u => u.role !== 'admin')
    
    if (nonSubscriber) {
      // Temporarily enable notifications to test subscription check
      const originalNotifications = nonSubscriber.notificationsEnabled
      await KV.updateUser(nonSubscriber.id, { notificationsEnabled: true })
      
      const nonSubResult = await sendATHNotificationEmail(nonSubscriber, testData)
      testResults.push({
        test: 'Non-Subscriber Protection',
        blocked: !nonSubResult.success,
        error: nonSubResult.error,
        expected: 'Should be blocked if no active subscription',
        result: nonSubResult.success ? '❌ SECURITY FLAW: Non-subscriber received email!' : '✅ Correctly blocked'
      })
      
      // Restore original setting
      await KV.updateUser(nonSubscriber.id, { notificationsEnabled: originalNotifications })
    }

    // Test 3: Try to send to user with disabled notifications
    console.log('🧪 Test 3: Disabled notifications protection')
    if (nonSubscriber) {
      await KV.updateUser(nonSubscriber.id, { notificationsEnabled: false })
      
      const disabledResult = await sendATHNotificationEmail(nonSubscriber, testData)
      testResults.push({
        test: 'Disabled Notifications Protection',
        blocked: !disabledResult.success,
        error: disabledResult.error,
        expected: 'Should be blocked',
        result: disabledResult.success ? '❌ SECURITY FLAW: Disabled user received email!' : '✅ Correctly blocked'
      })
    }

    const securityStatus = testResults.every(t => t.blocked) ? '✅ SECURE' : '❌ SECURITY ISSUES FOUND'
    
    console.log('🔒 Email Security Test Results:', { securityStatus, testResults })

    return NextResponse.json({
      success: true,
      securityStatus,
      message: 'Email security validation completed',
      testResults,
      testedBy: user.email,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Email security test error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to run security tests' },
      { status: 500 }
    )
  }
}