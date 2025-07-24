import { NextResponse } from 'next/server'
import { KV } from '@/lib/kv'

export async function POST() {
  try {
    console.log('🔧 Testing direct user notification log write')
    
    // Get test user
    const testUser = await KV.getUserByEmail('muminurbsccl@gmail.com')
    if (!testUser) {
      return NextResponse.json({ success: false, error: 'Test user not found' })
    }
    
    console.log(`Test user: ${testUser.email} (ID: ${testUser.id})`)
    
    // Create a test log entry
    const testLogEntry = {
      userId: testUser.id,
      notificationId: 'test-notification-123',
      cryptoId: 'binancecoin',
      sentAt: new Date().toISOString(),
    }
    
    console.log('Test log entry:', testLogEntry)
    
    // Try to save it directly
    console.log('Attempting to save user notification log...')
    await KV.saveUserNotificationLog(testUser.id, testLogEntry)
    console.log('✅ Save completed successfully')
    
    // Verify it was saved
    const retrievedLogs = await KV.getUserNotificationHistory(testUser.id, 10)
    console.log(`Retrieved ${retrievedLogs.length} logs after save`)
    
    if (retrievedLogs.length > 0) {
      console.log('Sample retrieved log:', retrievedLogs[0])
    }
    
    // Also check the raw Redis data
    const userNotificationKey = `user:${testUser.id}:notifications`
    const notificationEntries = await KV['zrange']?.(userNotificationKey, 0, -1) || []
    console.log(`Raw Redis entries in '${userNotificationKey}': ${notificationEntries.length}`)
    
    if (notificationEntries.length > 0) {
      console.log('Sample raw entry:', notificationEntries[0])
    }
    
    return NextResponse.json({
      success: true,
      data: {
        testUser: {
          email: testUser.email,
          id: testUser.id
        },
        testLogEntry,
        results: {
          retrievedLogsCount: retrievedLogs.length,
          rawRedisEntriesCount: notificationEntries.length,
          retrievedLogs: retrievedLogs.slice(0, 3),
          rawEntries: notificationEntries.slice(0, 3)
        }
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Test user log write error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test write failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}