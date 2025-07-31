import { NextRequest, NextResponse } from 'next/server'
import { validateServerSession } from '@/lib/auth'
import { KV } from '@/lib/kv'

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Clear Rate Limits: Starting rate limit cleanup')
    
    // Verify admin authentication for security
    const session = await validateServerSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get all rate limit keys
    const rateLimitKeys = await KV.keys('rate_limit:*')
    console.log(`🧹 Clear Rate Limits: Found ${rateLimitKeys.length} rate limit keys`)
    
    if (rateLimitKeys.length > 0) {
      // Delete all rate limit keys
      for (const key of rateLimitKeys) {
        await KV.del(key)
      }
      console.log(`🧹 Clear Rate Limits: Deleted ${rateLimitKeys.length} rate limit keys`)
    }

    console.log('✅ Clear Rate Limits: Rate limits cleared successfully')
    
    return NextResponse.json({
      success: true,
      message: 'All rate limits cleared successfully',
      keysCleared: rateLimitKeys.length
    })

  } catch (error) {
    console.error('❌ Clear Rate Limits: Failed to clear rate limits:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear rate limits'
    }, { status: 500 })
  }
}