import { NextRequest, NextResponse } from 'next/server'
import { KV } from '@/lib/kv'
import { z } from 'zod'

const unsubscribeSchema = z.object({
  token: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unsubscribe token is required' },
        { status: 400 }
      )
    }

    // Get unsubscribe token data
    const tokenData = await KV.getUnsubscribeToken(token)
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired unsubscribe token' },
        { status: 404 }
      )
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = new Date(tokenData.expiresAt)
    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Unsubscribe token has expired' },
        { status: 410 }
      )
    }

    // Get user data
    const user = await KV.getUser(tokenData.userId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        email: user.email,
        notificationsEnabled: user.notificationsEnabled,
        token: token,
      },
    })
  } catch (error) {
    console.error('Failed to get unsubscribe info:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process unsubscribe request' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = unsubscribeSchema.parse(body)

    // Get unsubscribe token data
    const tokenData = await KV.getUnsubscribeToken(token)
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired unsubscribe token' },
        { status: 404 }
      )
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = new Date(tokenData.expiresAt)
    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Unsubscribe token has expired' },
        { status: 410 }
      )
    }

    // Get user and disable notifications
    const user = await KV.getUser(tokenData.userId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Disable notifications for the user
    const updatedUser = {
      ...user,
      notificationsEnabled: false,
    }

    await KV.updateUser(updatedUser)

    console.log(`User ${user.email} unsubscribed from notifications`)

    return NextResponse.json({
      success: true,
      data: {
        message: 'Successfully unsubscribed from notifications',
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Failed to unsubscribe user:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to process unsubscribe request' },
      { status: 500 }
    )
  }
}
