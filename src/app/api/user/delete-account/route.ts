import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'

export async function DELETE() {
  try {
    const session = await Auth.getCurrentSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete user account and all associated data
    await Auth.deleteUser(session.id)
    
    // Clear session
    await Auth.logout()

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}