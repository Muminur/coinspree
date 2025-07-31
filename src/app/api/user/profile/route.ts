import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { userProfileLimiter } from '@/lib/rate-limit'
import { SecurityMiddleware } from '@/lib/security-middleware'
import { z } from 'zod'

const updateProfileSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function GET() {
  try {
    const session = await Auth.getCurrentSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.id,
        email: session.email,
        role: session.role,
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Rate limiting for profile updates
    const rateLimit = await userProfileLimiter.check(request)
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Too many profile updates. Please try again later.' },
        { status: 429 }
      )
    }

    const session = await Auth.getCurrentSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email } = updateProfileSchema.parse(body)

    // Update user email
    await Auth.updateUserEmail(session.id, email)

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: SecurityMiddleware.sanitizeError(error) },
      { status: 500 }
    )
  }
}