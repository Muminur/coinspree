import { NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'

export async function POST() {
  try {
    await Auth.logout()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
