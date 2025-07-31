import { NextRequest, NextResponse } from 'next/server'
import { validateServerSession } from './auth'
import { KV } from './kv'
import { SecurityMiddleware } from './security-middleware'

export interface AuthorizedRequest {
  session: {
    id: string
    userId: string
    email: string
    role: 'user' | 'admin'
    isActive: boolean
  }
  user: {
    id: string
    email: string
    role: 'user' | 'admin'
    isActive: boolean
    createdAt: string
    lastLogin: string
    notificationsEnabled: boolean
  }
}

/**
 * Comprehensive authorization middleware for API endpoints
 */
export class AuthMiddleware {
  /**
   * Require authentication for endpoint
   */
  static async requireAuth(request: NextRequest): Promise<
    { success: true; data: AuthorizedRequest } | 
    { success: false; response: NextResponse }
  > {
    try {
      const session = await validateServerSession()
      
      if (!session) {
        return {
          success: false,
          response: NextResponse.json(
            { success: false, error: 'Authentication required' },
            { status: 401 }
          )
        }
      }

      const user = await KV.getUserById(session.userId)
      
      if (!user || !user.isActive) {
        return {
          success: false,
          response: NextResponse.json(
            { success: false, error: 'User account inactive' },
            { status: 401 }
          )
        }
      }

      return {
        success: true,
        data: { session, user }
      }
    } catch (error) {
      console.error('Auth middleware error:', error)
      return {
        success: false,
        response: NextResponse.json(
          { 
            success: false, 
            error: SecurityMiddleware.sanitizeError(error)
          },
          { status: 500 }
        )
      }
    }
  }

  /**
   * Require admin privileges for endpoint
   */
  static async requireAdmin(request: NextRequest): Promise<
    { success: true; data: AuthorizedRequest } | 
    { success: false; response: NextResponse }
  > {
    const authResult = await this.requireAuth(request)
    
    if (!authResult.success) {
      return authResult
    }

    const { session, user } = authResult.data

    // Double-check admin privileges
    if (session.role !== 'admin' || user.role !== 'admin') {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: 'Admin privileges required' },
          { status: 403 }
        )
      }
    }

    // Additional admin validation using security middleware
    const adminValidation = await SecurityMiddleware.validateAdminAccess(
      session.userId,
      KV.getUserById.bind(KV)
    )

    if (!adminValidation.isValid) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: adminValidation.error || 'Admin access denied' },
          { status: 403 }
        )
      }
    }

    return authResult
  }

  /**
   * Require user to be accessing their own data or be admin
   */
  static async requireOwnershipOrAdmin(
    request: NextRequest,
    resourceUserId: string
  ): Promise<
    { success: true; data: AuthorizedRequest } | 
    { success: false; response: NextResponse }
  > {
    const authResult = await this.requireAuth(request)
    
    if (!authResult.success) {
      return authResult
    }

    const { session } = authResult.data
    
    // Allow access if user owns the resource or is admin
    if (session.userId !== resourceUserId && session.role !== 'admin') {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    return authResult
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(
    error: any, 
    status: number = 500,
    fallbackMessage: string = 'An error occurred'
  ): NextResponse {
    const sanitizedError = SecurityMiddleware.sanitizeError(error)
    
    return NextResponse.json(
      { success: false, error: sanitizedError || fallbackMessage },
      { status }
    )
  }

  /**
   * Create standardized success response
   */
  static createSuccessResponse(
    data: any,
    message?: string,
    status: number = 200
  ): NextResponse {
    const response: any = { success: true }
    
    if (data !== undefined) {
      response.data = data
    }
    
    if (message) {
      response.message = message
    }
    
    return NextResponse.json(response, { status })
  }

  /**
   * Validate request body with Zod schema
   */
  static async validateRequestBody<T>(
    request: NextRequest,
    schema: any
  ): Promise<
    { success: true; data: T } | 
    { success: false; response: NextResponse }
  > {
    try {
      const body = await request.json()
      const validation = schema.safeParse(body)
      
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {}
        validation.error.errors.forEach((err: any) => {
          const field = err.path[0] as string
          fieldErrors[field] = err.message
        })
        
        return {
          success: false,
          response: NextResponse.json(
            { 
              success: false, 
              error: 'Validation failed',
              fieldErrors 
            },
            { status: 400 }
          )
        }
      }
      
      return { success: true, data: validation.data }
    } catch (error) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: 'Invalid JSON in request body' },
          { status: 400 }
        )
      }
    }
  }
}

/**
 * Utility wrapper for admin endpoints
 */
export function withAdminAuth(
  handler: (request: NextRequest, auth: AuthorizedRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const authResult = await AuthMiddleware.requireAdmin(request)
    
    if (!authResult.success) {
      return authResult.response
    }
    
    return handler(request, authResult.data, ...args)
  }
}

/**
 * Utility wrapper for authenticated endpoints
 */
export function withAuth(
  handler: (request: NextRequest, auth: AuthorizedRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const authResult = await AuthMiddleware.requireAuth(request)
    
    if (!authResult.success) {
      return authResult.response
    }
    
    return handler(request, authResult.data, ...args)
  }
}