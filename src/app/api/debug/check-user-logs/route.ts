import { NextResponse } from 'next/server'
import { KV } from '@/lib/kv'

export async function GET() {
  try {
    console.log('🔍 Debugging user notification logs')
    
    // Get a specific user
    const testUser = await KV.getUserByEmail('muminurbsccl@gmail.com')
    if (!testUser) {
      return NextResponse.json({ success: false, error: 'Test user not found' })
    }
    
    console.log(`Testing user: ${testUser.email} (ID: ${testUser.id})`)
    
    // Check if the Redis keys exist for this user
    const userEmailKey = `user:${testUser.id}:emails`
    const userNotificationKey = `user:${testUser.id}:notifications`
    
    // Try different methods to get the data
    const emailIds = await KV['zrange']?.(userEmailKey, 0, -1) || []
    const notificationEntries = await KV['zrange']?.(userNotificationKey, 0, -1) || []
    
    console.log(`User email key '${userEmailKey}': ${emailIds.length} entries`)
    console.log(`User notification key '${userNotificationKey}': ${notificationEntries.length} entries`)
    
    // Try the method directly
    const userNotifications = await KV.getUserNotificationHistory(testUser.id, 50)
    console.log(`getUserNotificationHistory returned: ${userNotifications.length} notifications`)
    
    // Check for any user-related keys
    const allKeys = await KV['keys']?.(`user:${testUser.id}:*`) || []
    console.log(`All user keys: ${allKeys.length}`)
    allKeys.forEach(key => console.log(`  - ${key}`))
    
    // Check the raw notification entries
    if (notificationEntries.length > 0) {
      console.log('Sample notification entries:')
      notificationEntries.slice(0, 3).forEach((entry, index) => {
        console.log(`  Entry ${index + 1}: ${entry}`)
        try {
          const parsed = JSON.parse(entry as string)
          console.log(`    Parsed:`, parsed)
        } catch (e) {
          console.log(`    Parse error: ${e}`)
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        testUser: {
          email: testUser.email,
          id: testUser.id
        },
        redisKeys: {
          userEmailKey,
          userNotificationKey,
          allUserKeys: allKeys
        },
        counts: {
          emailIds: emailIds.length,
          notificationEntries: notificationEntries.length,
          userNotifications: userNotifications.length
        },
        sampleData: {
          emailIds: emailIds.slice(0, 5),
          notificationEntries: notificationEntries.slice(0, 3).map(entry => {
            try {
              return JSON.parse(entry as string)
            } catch {
              return entry
            }
          }),
          userNotifications: userNotifications.slice(0, 3)
        }
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Check user logs error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}