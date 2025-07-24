import { NextResponse } from 'next/server'
import { KV } from '@/lib/kv'

export async function POST() {
  try {
    console.log('🔧 Debugging getUserNotificationHistory method step by step')
    
    // Get test user
    const testUser = await KV.getUserByEmail('muminurbsccl@gmail.com')
    if (!testUser) {
      return NextResponse.json({ success: false, error: 'Test user not found' })
    }
    
    console.log(`Test user: ${testUser.email} (ID: ${testUser.id})`)
    
    // First, add a test entry manually
    const testLogEntry = {
      userId: testUser.id,
      notificationId: 'Ly8HYqWkzCmbP9oD', // Use the real BNB notification ID
      cryptoId: 'binancecoin',
      sentAt: new Date().toISOString(),
    }
    
    console.log('Adding test entry:', testLogEntry)
    
    // Add entry using zadd directly
    await KV['zadd']?.(`user:${testUser.id}:notifications`, {
      score: Date.now(),
      member: JSON.stringify(testLogEntry),
    })
    
    console.log('✅ Test entry added')
    
    // Step 1: Get raw entries from zrange
    const entries = await KV['zrange']?.(
      `user:${testUser.id}:notifications`,
      0,
      10,
      { rev: true }
    ) || []
    
    console.log(`Step 1 - Raw entries: ${entries.length}`)
    entries.forEach((entry, index) => {
      console.log(`  Entry ${index + 1}: ${entry}`)
    })
    
    // Step 2: Parse entries and extract notification IDs
    const notificationIds = entries
      .map((entry) => {
        try {
          const parsed = JSON.parse(entry as string)
          console.log(`  Parsed entry:`, parsed)
          return parsed.notificationId
        } catch (e) {
          console.log(`  Parse error for entry '${entry}':`, e)
          return null
        }
      })
      .filter(Boolean)
    
    console.log(`Step 2 - Extracted notification IDs: ${notificationIds.length}`)
    notificationIds.forEach((id, index) => {
      console.log(`  ID ${index + 1}: ${id}`)
    })
    
    // Step 3: Fetch full notifications from each ID
    const notifications = await Promise.all(
      notificationIds.map(async (id) => {
        const notification = await KV['hgetall']?.(`notification:${id}`)
        console.log(`  Fetched notification ${id}:`, notification ? 'EXISTS' : 'NOT_FOUND')
        return notification
      })
    )
    
    const validNotifications = notifications.filter(Boolean)
    console.log(`Step 3 - Valid notifications: ${validNotifications.length}`)
    
    // Step 4: Test the actual method
    const methodResult = await KV.getUserNotificationHistory(testUser.id, 10)
    console.log(`Step 4 - Method result: ${methodResult.length} notifications`)
    
    return NextResponse.json({
      success: true,
      data: {
        testUser: {
          email: testUser.email,
          id: testUser.id
        },
        testLogEntry,
        debugging: {
          step1_rawEntries: entries.length,
          step2_extractedIds: notificationIds.length,
          step3_validNotifications: validNotifications.length,
          step4_methodResult: methodResult.length
        },
        details: {
          rawEntries: entries,
          extractedIds: notificationIds,
          notifications: validNotifications.slice(0, 3),
          methodResult: methodResult.slice(0, 3)
        }
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Debug user log method error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}