import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { z } from 'zod'

const UpdateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.enum(['user', 'admin']),
  isActive: z.boolean(),
  notificationsEnabled: z.boolean()
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require admin authentication
    const session = await Auth.requireAuth()
    const adminUser = await KV.getUserById(session.userId)
    
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const userId = params.id
    const body = await request.json()
    
    // Validate request data
    const validation = UpdateUserSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid data provided',
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const updateData = validation.data

    // Get the target user
    const targetUser = await KV.getUserById(userId)
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent admins from demoting themselves to prevent lockout
    if (targetUser.id === adminUser.id && updateData.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot demote yourself from admin role' },
        { status: 400 }
      )
    }

    // Check if email is being changed and if it's already in use
    if (updateData.email !== targetUser.email) {
      const existingUser = await KV.getUserByEmail(updateData.email)
      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json(
          { success: false, error: 'Email already in use by another user' },
          { status: 400 }
        )
      }
    }

    // Update user data
    const updatedUser = {
      ...targetUser,
      email: updateData.email,
      role: updateData.role,
      isActive: updateData.isActive,
      notificationsEnabled: updateData.notificationsEnabled
    }

    await KV.updateUser(userId, updatedUser)

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        notificationsEnabled: updatedUser.notificationsEnabled
      }
    })

  } catch (error) {
    console.error('Admin user PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require admin authentication
    const session = await Auth.requireAuth()
    const adminUser = await KV.getUserById(session.userId)
    
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const userId = params.id

    // Get the target user
    const targetUser = await KV.getUserById(userId)
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent admins from deleting themselves
    if (targetUser.id === adminUser.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own admin account' },
        { status: 400 }
      )
    }

    // Delete user and related data
    await KV.deleteUser(userId)
    
    // Note: User subscriptions and related data will be handled by the deleteUser method

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      deletedUser: {
        id: targetUser.id,
        email: targetUser.email
      }
    })

  } catch (error) {
    console.error('Admin user DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}