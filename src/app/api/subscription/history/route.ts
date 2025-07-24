import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { SubscriptionService } from '@/lib/subscription'

export async function GET() {
  try {
    const session = await Auth.getCurrentSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get subscription history for the user
    const subscriptions = await SubscriptionService.getSubscriptionHistory(session.userId)
    
    console.log(`📊 Fetched ${subscriptions.length} subscriptions for user ${session.userId}:`, 
      subscriptions.map(s => ({ id: s.id, status: s.status, amount: s.amount, createdAt: s.createdAt }))
    )

    return NextResponse.json({
      success: true,
      payments: subscriptions
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment history' },
      { status: 500 }
    )
  }
}