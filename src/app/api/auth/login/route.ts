import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Auth } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'
import { authLimiter } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await authLimiter.check(request)
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    const user = await Auth.loginUser(email, password)
    await Auth.createSession(user)

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

    // Handle authentication errors
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
