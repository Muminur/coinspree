import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { KV } from './kv'
import { sendPasswordResetEmail } from './email'
import { StringUtils, DateUtils } from './utils'
import type { User, SafeUser, AuthSession } from '@/types'

export class Auth {
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12)
  }

  static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, hash)
  }

  static async createUser(
    email: string,
    password: string,
    role: 'user' | 'admin' = 'user'
  ): Promise<SafeUser> {
    const existingUser = await KV.getUserByEmail(email)
    if (existingUser) throw new Error('User already exists')

    const user: User = {
      id: StringUtils.generateId(16),
      email,
      passwordHash: await this.hashPassword(password),
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      notificationsEnabled: true,
    }

    await KV.createUser(user)
    const { passwordHash: _, ...safeUser } = user
    return safeUser
  }

  static async loginUser(email: string, password: string): Promise<SafeUser> {
    const user = await KV.getUserByEmail(email)
    if (!user || !user.isActive) throw new Error('Invalid credentials')

    const isValid = await this.verifyPassword(password, user.passwordHash)
    if (!isValid) throw new Error('Invalid credentials')

    await KV.updateUser(user.id, { lastLogin: new Date().toISOString() })

    const { passwordHash: _, ...safeUser } = user
    return safeUser
  }

  static async createSession(user: SafeUser): Promise<void> {
    const sessionId = StringUtils.generateId(32)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await KV.createSession(sessionId, user.id, expiresAt)

    cookies().set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    })
  }

  static async getSession(): Promise<AuthSession | null> {
    const sessionId = cookies().get('session')?.value
    if (!sessionId) return null

    const userId = await KV.getSession(sessionId)
    if (!userId) return null

    const user = await KV.getUserById(userId)
    if (!user || !user.isActive) return null

    return {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    }
  }

  static async logout(): Promise<void> {
    const sessionId = cookies().get('session')?.value
    if (sessionId) {
      await KV.deleteSession(sessionId)
    }
    cookies().delete('session')
  }

  static async requireAuth(): Promise<AuthSession> {
    const session = await this.getSession()
    if (!session) redirect('/login')
    return session
  }

  static async requireAdmin(): Promise<AuthSession> {
    const session = await this.requireAuth()
    if (session.role !== 'admin') redirect('/dashboard')
    return session
  }

  static async requestPasswordReset(email: string): Promise<void> {
    const user = await KV.getUserByEmail(email)
    if (!user) return // Don't reveal if email exists

    const token = StringUtils.generateId(32)
    const expiresAt = DateUtils.addDays(new Date(), 1) // 24 hours

    await KV.createPasswordReset(user.id, token, expiresAt)

    // Send password reset email (async, don't wait for completion)
    sendPasswordResetEmail(user, token).catch((error) => {
      console.error('Failed to send password reset email:', error)
    })
  }

  static async updateUserEmail(userId: string, newEmail: string): Promise<void> {
    // Check if email is already taken
    const existingUser = await KV.getUserByEmail(newEmail)
    if (existingUser && existingUser.id !== userId) {
      throw new Error('Email already in use')
    }

    await KV.updateUser(userId, { email: newEmail })
  }

  static async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await this.hashPassword(newPassword)
    await KV.updateUser(userId, { passwordHash: hashedPassword })
  }

  static async verifyUserPassword(userId: string, password: string): Promise<boolean> {
    const user = await KV.getUserById(userId)
    if (!user) return false
    return await this.verifyPassword(password, user.passwordHash)
  }

  static async deleteUser(userId: string): Promise<void> {
    await KV.deleteUser(userId)
  }

  static async getUserById(userId: string): Promise<SafeUser | null> {
    const user = await KV.getUserById(userId)
    if (!user) return null
    
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      notificationsEnabled: user.notificationsEnabled,
    }
  }

  static async getCurrentSession(): Promise<AuthSession | null> {
    return await this.getSession()
  }

  static async resetPassword(
    token: string,
    newPassword: string
  ): Promise<void> {
    const reset = await KV.getPasswordReset(token)
    if (!reset || DateUtils.isInPast(reset.expiresAt)) {
      throw new Error('Invalid or expired reset token')
    }

    const hashedPassword = await this.hashPassword(newPassword)
    await Promise.all([
      KV.updateUser(reset.userId, { passwordHash: hashedPassword }),
      KV.deletePasswordReset(token),
    ])
  }
}

// Utility functions for API routes
import { NextRequest } from 'next/server'

export async function validateSession(
  request: NextRequest
): Promise<AuthSession | null> {
  try {
    const sessionId = request.cookies.get('session')?.value
    if (!sessionId) return null

    const userId = await KV.getSession(sessionId)
    if (!userId) return null

    const user = await KV.getUserById(userId)
    if (!user || !user.isActive) return null

    return {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    }
  } catch (error) {
    console.error('Session validation error:', error)
    return null
  }
}

export async function validateServerSession(): Promise<AuthSession | null> {
  return await Auth.getSession()
}
