import { NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { KV } from '@/lib/kv'

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

    // Trigger the cron job manually by calling the cron endpoint
    const cronUrl = `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/cron/update-crypto`
    
    const response = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'dev-secret'}`
      }
    })

    const result = await response.json()

    console.log(`🔧 Manual cron trigger by admin ${user.email}:`, result)

    return NextResponse.json({
      success: true,
      message: 'Cron job triggered successfully',
      cronResult: result,
      triggeredBy: user.email,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Manual cron trigger error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to trigger cron job' },
      { status: 500 }
    )
  }
}