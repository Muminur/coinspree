import { NextResponse } from 'next/server'
import { KV } from '@/lib/kv'

export async function GET() {
  try {
    console.log('🔧 Testing basic KV operations')
    
    // Test 1: Basic set/get
    const testKey = 'test:basic:' + Date.now()
    const testValue = 'hello world'
    
    console.log(`Setting ${testKey} = ${testValue}`)
    await KV['set']?.(testKey, testValue)
    
    const retrieved = await KV['get']?.(testKey)
    console.log(`Retrieved: ${retrieved}`)
    
    // Test 2: Hash operations
    const testHashKey = 'test:hash:' + Date.now()
    const testHashData = { name: 'Test', value: 42 }
    
    console.log(`Setting hash ${testHashKey}:`, testHashData)
    await KV['hset']?.(testHashKey, testHashData as any)
    
    const retrievedHash = await KV['hgetall']?.(testHashKey)
    console.log(`Retrieved hash:`, retrievedHash)
    
    // Test 3: Sorted set operations (zadd/zrange)
    const testSortedSetKey = 'test:sortedset:' + Date.now()
    const testMember = JSON.stringify({ id: 'test123', message: 'hello' })
    
    console.log(`Adding to sorted set ${testSortedSetKey}: ${testMember}`)
    const zaddResult = await KV['zadd']?.(testSortedSetKey, {
      score: Date.now(),
      member: testMember
    })
    console.log(`zadd result: ${zaddResult}`)
    
    const zrangeResult = await KV['zrange']?.(testSortedSetKey, 0, -1)
    console.log(`zrange result:`, zrangeResult)
    
    // Test 4: Test with user notification key pattern
    const testUser = await KV.getUserByEmail('muminurbsccl@gmail.com')
    if (testUser) {
      const userNotificationKey = `user:${testUser.id}:notifications`
      const testEntry = JSON.stringify({
        userId: testUser.id,
        notificationId: 'test-123',
        cryptoId: 'bitcoin',
        sentAt: new Date().toISOString()
      })
      
      console.log(`Testing user notification key: ${userNotificationKey}`)
      const userZaddResult = await KV['zadd']?.(userNotificationKey, {
        score: Date.now(),
        member: testEntry
      })
      console.log(`User zadd result: ${userZaddResult}`)
      
      const userZrangeResult = await KV['zrange']?.(userNotificationKey, 0, -1)
      console.log(`User zrange result:`, userZrangeResult)
    }
    
    // Cleanup
    await KV['del']?.(testKey)
    await KV['del']?.(testHashKey)
    await KV['del']?.(testSortedSetKey)
    
    return NextResponse.json({
      success: true,
      data: {
        basicSetGet: {
          set: testValue,
          retrieved: retrieved,
          match: retrieved === testValue
        },
        hashSetGet: {
          set: testHashData,
          retrieved: retrievedHash
        },
        sortedSetOps: {
          zaddResult,
          zrangeResult
        },
        userTest: testUser ? {
          userId: testUser.id,
          userNotificationKey: `user:${testUser.id}:notifications`
        } : 'No test user found'
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Basic KV test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'KV test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}