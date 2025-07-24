import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Auth } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'
import { registerSchema } from '@/lib/validations'
import { authLimiter } from '@/lib/rate-limit'
import { KV } from '@/lib/kv'

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await authLimiter.check(request)
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many registration attempts. Try again later.',
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { email, password } = registerSchema.parse(body)

    const user = await Auth.createUser(email, password)
    await Auth.createSession(user)

    // Send welcome email (async, don't wait for completion)
    const fullUser = await KV.getUserByEmail(email)
    if (fullUser) {
      sendWelcomeEmail(fullUser).catch((error) => {
        console.error('Failed to send welcome email:', error)
      })
    }

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    // Handle Zod validation errors with field-specific messages
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {}
      error.errors.forEach((err) => {
        const field = err.path[0] as string
        fieldErrors[field] = err.message
      })
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          fieldErrors 
        },
        { status: 400 }
      )
    }

    // Handle other errors (like user already exists)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
