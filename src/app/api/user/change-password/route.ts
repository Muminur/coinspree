import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { z } from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .refine((password) => /[a-z]/.test(password), {
      message: 'Password must include at least one lowercase letter (a-z)',
    })
    .refine((password) => /[A-Z]/.test(password), {
      message: 'Password must include at least one uppercase letter (A-Z)',
    })
    .refine((password) => /\d/.test(password), {
      message: 'Password must include at least one number (0-9)',
    }),
})

export async function POST(request: NextRequest) {
  try {
    const session = await Auth.getCurrentSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = changePasswordSchema.parse(body)

    // Verify current password
    const isValidPassword = await Auth.verifyUserPassword(session.id, currentPassword)
    if (!isValidPassword) {
      return NextResponse.json(
        { 
          success: false, 
          fieldErrors: { currentPassword: 'Current password is incorrect' }
        },
        { status: 400 }
      )
    }

    // Update password
    await Auth.updateUserPassword(session.id, newPassword)

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {}
      error.errors.forEach((err) => {
        const field = err.path[0] as string
        fieldErrors[field] = err.message
      })
      return NextResponse.json(
        { success: false, error: 'Validation failed', fieldErrors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to change password' },
      { status: 500 }
    )
  }
}