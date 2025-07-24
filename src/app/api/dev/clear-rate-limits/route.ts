import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function POST() {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, error: 'Only available in development' },
        { status: 403 }
      )
    }

    // Get all keys that match rate limit patterns
    const keys = []
    
    // Since we can't scan keys easily in KV, let's try to delete common rate limit patterns
    const commonIPs = ['127.0.0.1', '::1', 'localhost', 'anonymous']
    const currentTime = Math.floor(Date.now() / (900 * 1000)) // 15 minutes in seconds
    
    // Generate possible rate limit keys for the last few time windows
    for (let i = 0; i < 5; i++) {
      const timeWindow = currentTime - i
      for (const ip of commonIPs) {
        keys.push(`rate_limit:${ip}:${timeWindow}`)
      }
    }

    // Delete the keys
    let deletedCount = 0
    for (const key of keys) {
      try {
        await kv.del(key)
        deletedCount++
      } catch (error) {
        // Key might not exist, that's fine
        console.log(`Could not delete key ${key}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Rate limits cleared',
      deletedKeys: deletedCount,
      note: 'You can now make auth requests again'
    })
  } catch (error) {
    console.error('Error clearing rate limits:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}