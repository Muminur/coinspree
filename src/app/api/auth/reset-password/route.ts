import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { passwordResetSchema } from '@/lib/validations'
import { passwordResetLimiter } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await passwordResetLimiter.check(request)
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Too many reset attempts. Try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { email } = passwordResetSchema.parse(body)

    await Auth.requestPasswordReset(email)

    return NextResponse.json({
      success: true,
      message: 'If an account exists, a reset email has been sent.',
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, newPassword } = body

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Token and new password are required' },
        { status: 400 }
      )
    }

    await Auth.resetPassword(token, newPassword)

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
