import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, UserPayload, hasRole, hasPermission } from './jwt'
import { createApiError } from '@/lib/validators'
import { verifyCSRFProtection } from '@/lib/security/csrf'

export interface AuthenticatedHandler {
  (request: NextRequest, user: UserPayload): Promise<NextResponse>
}

/**
 * Wrapper for authenticated API routes
 * Handles authentication check and provides user context
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options?: {
    requiredRole?: 'admin' | 'user' | 'viewer'
    requiredPermission?: string
    requireCSRF?: boolean
  }
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    try {
      // Check CSRF token for state-changing operations
      const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
      const shouldCheckCSRF = options?.requireCSRF !== false && isStateChanging
      
      if (shouldCheckCSRF) {
        const { valid, error } = verifyCSRFProtection(request)
        if (!valid) {
          return NextResponse.json(
            createApiError(error || 'CSRF validation failed', 'CSRF_ERROR'),
            { status: 403 }
          )
        }
      }
      
      // Get user from request
      const user = await getUserFromRequest(request)
      
      if (!user) {
        return NextResponse.json(
          createApiError('Authentication required', 'UNAUTHORIZED'),
          { status: 401 }
        )
      }
      
      // Check role if required
      if (options?.requiredRole && !hasRole(user, options.requiredRole)) {
        return NextResponse.json(
          createApiError(
            `${options.requiredRole} role required`,
            'FORBIDDEN'
          ),
          { status: 403 }
        )
      }
      
      // Check permission if required
      if (options?.requiredPermission && !hasPermission(user, options.requiredPermission)) {
        return NextResponse.json(
          createApiError(
            `Missing required permission: ${options.requiredPermission}`,
            'FORBIDDEN'
          ),
          { status: 403 }
        )
      }
      
      // Call the handler with user context
      return handler(request, user)
      
    } catch (error) {
      console.error('Authentication error:', error)
      return NextResponse.json(
        createApiError('Authentication failed', 'AUTH_ERROR'),
        { status: 401 }
      )
    }
  }
}

/**
 * Get user from request headers (populated by middleware)
 */
export function getUserFromHeaders(request: NextRequest): UserPayload | null {
  const userId = request.headers.get('x-user-id')
  const userEmail = request.headers.get('x-user-email')
  const userRole = request.headers.get('x-user-role') as 'admin' | 'user' | 'viewer' | null
  
  if (!userId || !userEmail || !userRole) {
    return null
  }
  
  return {
    id: userId,
    email: userEmail,
    role: userRole,
    permissions: [] // Permissions should be fetched from database in production
  }
}