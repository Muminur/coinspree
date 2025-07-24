import { NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await Auth.getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }
    return NextResponse.json({ 
      success: true, 
      data: session, 
      user: session // Provide both for compatibility
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
